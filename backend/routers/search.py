from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import EventRow, VendorSearchRow
from backend.services.search.tasks import dispatch_research_plan

logger = get_logger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


class CategoryStatus(BaseModel):
    category: str
    query_count: int = 0
    result_count: int = 0


class SearchStatusResponse(BaseModel):
    event_id: str
    event_status: str
    categories: list[CategoryStatus] = Field(default_factory=list)
    total_results: int = 0


class SearchResultItem(BaseModel):
    name: str = ""
    category: str = ""
    website: str = ""
    description: str = ""
    exa_score: float | None = None


class SearchResultsResponse(BaseModel):
    event_id: str
    category: str
    results: list[SearchResultItem] = Field(default_factory=list)


class SearchRunDetail(BaseModel):
    """One persisted Exa search row (query + structured hits)."""

    id: str
    category: str
    query: str
    created_at: str
    result_count: int
    results: list[SearchResultItem] = Field(default_factory=list)


class SearchRunsResponse(BaseModel):
    event_id: str
    runs: list[SearchRunDetail] = Field(default_factory=list)


def _row_results_to_items(
    row: VendorSearchRow,
    *,
    category: str,
) -> list[SearchResultItem]:
    if not isinstance(row.results, list):
        return []
    items: list[SearchResultItem] = []
    for r in row.results:
        url = r.get("website") or r.get("exa_url", "")
        items.append(
            SearchResultItem(
                name=r.get("name", ""),
                category=r.get("category", category),
                website=url,
                description=(r.get("description") or "")[:500],
                exa_score=r.get("exa_score"),
            )
        )
    return items


class TriggerRequest(BaseModel):
    requirements: dict | None = None


class TriggerResponse(BaseModel):
    event_id: str
    dispatched: int
    message: str


@router.get("/{event_id}", response_model=SearchStatusResponse)
async def get_search_status(
    event_id: str,
    db: AsyncSession = Depends(get_session),
) -> SearchStatusResponse:
    """Get the search status for an event across all categories."""
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    event = await db.get(EventRow, eid)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    stmt = (
        select(VendorSearchRow)
        .where(VendorSearchRow.event_id == eid)
        .order_by(VendorSearchRow.created_at)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    cat_map: dict[str, CategoryStatus] = {}
    total = 0
    for row in rows:
        cat = row.category
        if cat not in cat_map:
            cat_map[cat] = CategoryStatus(category=cat)
        cat_map[cat].query_count += 1
        num_results = len(row.results) if isinstance(row.results, list) else 0
        cat_map[cat].result_count += num_results
        total += num_results

    return SearchStatusResponse(
        event_id=event_id,
        event_status=event.status,
        categories=list(cat_map.values()),
        total_results=total,
    )


@router.get("/{event_id}/runs", response_model=SearchRunsResponse)
async def get_search_runs(
    event_id: str,
    db: AsyncSession = Depends(get_session),
) -> SearchRunsResponse:
    """Return every stored search run (Exa query + hits) for dashboard inspection."""
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    event = await db.get(EventRow, eid)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    stmt = (
        select(VendorSearchRow)
        .where(VendorSearchRow.event_id == eid)
        .order_by(VendorSearchRow.created_at)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    runs: list[SearchRunDetail] = []
    for row in rows:
        cat = str(row.category)
        items = _row_results_to_items(row, category=cat)
        runs.append(
            SearchRunDetail(
                id=str(row.id),
                category=cat,
                query=row.query,
                created_at=row.created_at.isoformat() if row.created_at else "",
                result_count=len(items),
                results=items,
            )
        )

    return SearchRunsResponse(event_id=event_id, runs=runs)


@router.get("/{event_id}/{category}", response_model=SearchResultsResponse)
async def get_search_results(
    event_id: str,
    category: str,
    db: AsyncSession = Depends(get_session),
) -> SearchResultsResponse:
    """Get search results for a specific category."""
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    stmt = (
        select(VendorSearchRow)
        .where(VendorSearchRow.event_id == eid)
        .where(VendorSearchRow.category == category)
        .order_by(VendorSearchRow.created_at)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No search results for category '{category}'.",
        )

    seen_urls: set[str] = set()
    items: list[SearchResultItem] = []
    for row in rows:
        for item in _row_results_to_items(row, category=category):
            url = item.website
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            items.append(
                SearchResultItem(
                    name=item.name,
                    category=item.category,
                    website=item.website,
                    description=item.description[:300],
                    exa_score=item.exa_score,
                )
            )

    return SearchResultsResponse(
        event_id=event_id,
        category=category,
        results=items,
    )


@router.post("/{event_id}/trigger", response_model=TriggerResponse)
async def trigger_search(
    event_id: str,
    body: TriggerRequest | None = None,
    db: AsyncSession = Depends(get_session),
) -> TriggerResponse:
    """Manually trigger the search pipeline for an event (for testing)."""
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format.")

    event = await db.get(EventRow, eid)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    requirements = (
        body.requirements
        if body and body.requirements
        else event.requirements or {}
    )

    from backend.agents.planning_agent import PlanningAgent, ResearchPlan
    from backend.models.event_request import EventRequirements

    reqs = EventRequirements.model_validate(requirements)
    is_ready, missing_reasons = reqs.search_ready()
    if not is_ready:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough info to search: {'; '.join(missing_reasons)}",
        )

    planner = PlanningAgent()
    req_json = (
        "\n".join(f"{k}: {v}" for k, v in requirements.items() if v)
        if isinstance(requirements, dict)
        else str(requirements)
    )
    plan: ResearchPlan = await planner.run(
        [{"role": "user", "content": f"Plan research for this party:\n{req_json}"}]
    )

    event.status = "planning"
    await db.flush()

    plan_dict = plan.model_dump(mode="json")
    dispatch_research_plan.delay(event_id, plan_dict, requirements)

    logger.info(
        "search triggered manually",
        event_id=event_id,
        task_count=len(plan.tasks),
    )

    return TriggerResponse(
        event_id=event_id,
        dispatched=len(plan.tasks),
        message=plan.summary,
    )
