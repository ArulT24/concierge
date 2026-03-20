"""Pipeline monitoring: Exa → enrich → score → event_options."""

from __future__ import annotations

import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, nulls_last, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.models.db import EventOptionRow, EventRow, VendorCandidateRow, VendorSearchRow
from backend.services.search.tasks import finalize_vendor_pipeline

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class CandidateOut(BaseModel):
    id: str
    category: str
    url: str
    exa_name: str
    exa_description: str = ""
    exa_score: float | None = None
    stage: str
    enrichment: dict = Field(default_factory=dict)
    fit_score: float | None = None
    fit_rationale: str | None = None
    scoring_meta: dict = Field(default_factory=dict)
    display_rank: int | None = None
    error_message: str | None = None
    created_at: str = ""


class CategoryOptionsOut(BaseModel):
    category: str
    options_summary: list[dict] = Field(default_factory=list)
    created_at: str = ""


class PipelineSnapshotResponse(BaseModel):
    event_id: str
    event_status: str
    requirements: dict = Field(default_factory=dict)
    vendor_search_row_count: int = 0
    """Rows in ``vendor_searches`` (Exa persisted)."""

    pipeline_needs_finalize: bool = False
    """True when Exa data exists but no ``vendor_candidates`` yet (stale / pre-chord run)."""

    counts_by_stage: dict[str, int] = Field(default_factory=dict)
    candidates: list[CandidateOut] = Field(default_factory=list)
    ranked_options: list[CategoryOptionsOut] = Field(default_factory=list)


class FinalizeQueuedResponse(BaseModel):
    event_id: str
    queued: bool
    message: str


@router.post("/{event_id}/finalize", response_model=FinalizeQueuedResponse)
async def queue_pipeline_finalize(
    event_id: str,
    db: AsyncSession = Depends(get_session),
) -> FinalizeQueuedResponse:
    """Enqueue enrich + score for this event (uses existing ``vendor_searches``).

    Use when you already have Exa results but ``vendor_candidates`` is empty—e.g. searches
    ran before the Celery chord existed, or finalize failed earlier.
    """
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    event = await db.get(EventRow, eid)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    n_search = (
        await db.execute(
            select(func.count())
            .select_from(VendorSearchRow)
            .where(VendorSearchRow.event_id == eid)
        )
    ).scalar_one()
    if int(n_search or 0) == 0:
        raise HTTPException(
            status_code=400,
            detail="No vendor_searches rows for this event. Run Exa search first.",
        )

    req = event.requirements if isinstance(event.requirements, dict) else {}
    finalize_vendor_pipeline.delay(None, event_id, req)

    return FinalizeQueuedResponse(
        event_id=event_id,
        queued=True,
        message="Pipeline finalize queued on Celery (searches queue). Refresh this page in a few minutes.",
    )


@router.get("/{event_id}", response_model=PipelineSnapshotResponse)
async def get_pipeline_snapshot(
    event_id: str,
    db: AsyncSession = Depends(get_session),
) -> PipelineSnapshotResponse:
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    event = await db.get(EventRow, eid)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    n_search_rows = (
        await db.execute(
            select(func.count())
            .select_from(VendorSearchRow)
            .where(VendorSearchRow.event_id == eid)
        )
    ).scalar_one()
    vendor_search_row_count = int(n_search_rows or 0)

    c_stmt = (
        select(VendorCandidateRow)
        .where(VendorCandidateRow.event_id == eid)
        .order_by(
            VendorCandidateRow.category,
            nulls_last(VendorCandidateRow.display_rank.asc()),
        )
    )
    c_rows = list((await db.execute(c_stmt)).scalars().all())

    counts = Counter(r.stage for r in c_rows)

    candidates = [
        CandidateOut(
            id=str(r.id),
            category=r.category,
            url=r.url,
            exa_name=r.exa_name,
            exa_description=r.exa_description,
            exa_score=r.exa_score,
            stage=r.stage,
            enrichment=r.enrichment or {},
            fit_score=r.fit_score,
            fit_rationale=r.fit_rationale,
            scoring_meta=r.scoring_meta or {},
            display_rank=r.display_rank,
            error_message=r.error_message,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in c_rows
    ]

    o_stmt = select(EventOptionRow).where(EventOptionRow.event_id == eid)
    opt_rows = list((await db.execute(o_stmt)).scalars().all())
    ranked = [
        CategoryOptionsOut(
            category=r.category,
            options_summary=r.options_summary if isinstance(r.options_summary, list) else [],
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in opt_rows
    ]

    pipeline_needs_finalize = vendor_search_row_count > 0 and len(c_rows) == 0

    return PipelineSnapshotResponse(
        event_id=event_id,
        event_status=event.status,
        requirements=event.requirements if isinstance(event.requirements, dict) else {},
        vendor_search_row_count=vendor_search_row_count,
        pipeline_needs_finalize=pipeline_needs_finalize,
        counts_by_stage=dict(counts),
        candidates=candidates,
        ranked_options=ranked,
    )
