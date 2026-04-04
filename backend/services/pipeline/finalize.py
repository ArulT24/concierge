"""Run full pipeline after all Exa category searches complete."""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session_factory
from backend.logging_config import get_logger
from backend.models.db import EventOptionRow, EventRow, VendorCandidateRow
from backend.services.pipeline.collect import (
    load_search_rows,
    shortlist_from_rows,
)
from backend.services.pipeline.scoring import score_vendor_fit_sync
from backend.services.search.browserbase_client import scrape_vendor_page_sync

logger = get_logger(__name__)

ENRICH_CONCURRENCY = 2


async def _enrich_one(candidate_id: uuid.UUID, url: str) -> dict[str, Any]:
    def _run() -> dict[str, Any]:
        data = scrape_vendor_page_sync(url)
        return data.model_dump(mode="json")

    return await asyncio.to_thread(_run)


async def run_pipeline_for_event(
    event_id: uuid.UUID,
    requirements: dict[str, Any],
) -> dict[str, Any]:
    """Shortlist → persist candidates → Browserbase → Anthropic → event_options → ready."""
    factory = get_session_factory()
    stats: dict[str, Any] = {
        "event_id": str(event_id),
        "candidates": 0,
        "enriched": 0,
        "scored": 0,
        "errors": [],
    }

    async with factory() as db:
        event = await db.get(EventRow, event_id)
        if event is None:
            return {**stats, "error": "event_not_found"}

        event.status = "enriching"
        await db.commit()

    async with factory() as db:
        event = await db.get(EventRow, event_id)
        rows = await load_search_rows(db, event_id)
        shortlist = shortlist_from_rows(rows)

        await db.execute(
            delete(VendorCandidateRow).where(VendorCandidateRow.event_id == event_id)
        )
        await db.flush()

        candidate_ids: list[tuple[uuid.UUID, str]] = []
        for cat, entries in shortlist.items():
            for e in entries:
                row = VendorCandidateRow(
                    event_id=event_id,
                    category=cat,
                    url=e.url,
                    exa_name=e.exa_name,
                    exa_description=e.exa_description,
                    exa_score=e.exa_score,
                    stage="shortlisted",
                )
                db.add(row)
                await db.flush()
                candidate_ids.append((row.id, e.url))
        stats["candidates"] = len(candidate_ids)
        await db.commit()

    sem = asyncio.Semaphore(ENRICH_CONCURRENCY)

    async def enrich_row(cid: uuid.UUID, url: str) -> None:
        async with sem:
            async with factory() as db2:
                row = await db2.get(VendorCandidateRow, cid)
                if row is None:
                    return
                row.stage = "enriching"
                await db2.commit()

            try:
                payload = await _enrich_one(cid, url)
            except Exception as exc:
                async with factory() as db3:
                    row = await db3.get(VendorCandidateRow, cid)
                    if row:
                        row.stage = "failed"
                        row.error_message = f"enrich:{exc!s}"[:2000]
                        await db3.commit()
                stats["errors"].append({"id": str(cid), "phase": "enrich", "error": str(exc)})
                return

            async with factory() as db4:
                row = await db4.get(VendorCandidateRow, cid)
                if row:
                    row.enrichment = payload
                    row.stage = "enriched" if not payload.get("error") else "failed"
                    if payload.get("error"):
                        row.error_message = str(payload.get("error"))[:2000]
                    await db4.commit()
            if not payload.get("error"):
                stats["enriched"] += 1

    await asyncio.gather(
        *[enrich_row(cid, url) for cid, url in candidate_ids],
        return_exceptions=True,
    )

    async with factory() as db:
        event = await db.get(EventRow, event_id)
        if event:
            event.status = "scoring"
            await db.commit()

    async with factory() as db:
        stmt = select(VendorCandidateRow).where(
            VendorCandidateRow.event_id == event_id,
            VendorCandidateRow.stage != "failed",
        )
        cands = list((await db.execute(stmt)).scalars().all())

    for c in cands:
        async with factory() as db5:
            row = await db5.get(VendorCandidateRow, c.id)
            if row is None or row.stage == "failed":
                continue
            row.stage = "scoring"
            category = row.category
            exa_name = row.exa_name
            exa_description = row.exa_description
            exa_score = row.exa_score
            enrichment = dict(row.enrichment or {})
            await db5.commit()

        score = await asyncio.to_thread(
            score_vendor_fit_sync,
            requirements,
            category=category,
            exa_name=exa_name,
            exa_description=exa_description,
            exa_score=exa_score,
            enrichment=enrichment,
        )

        async with factory() as db6:
            row2 = await db6.get(VendorCandidateRow, c.id)
            if row2:
                row2.fit_score = score.get("fit_score")
                row2.fit_rationale = score.get("rationale")
                row2.scoring_meta = {
                    "pros": score.get("pros", []),
                    "cons": score.get("cons", []),
                    "skipped": score.get("skipped", False),
                }
                row2.stage = "scored"
                await db6.commit()
                stats["scored"] += 1

    async with factory() as db:
        stmt = select(VendorCandidateRow).where(VendorCandidateRow.event_id == event_id)
        all_c = list((await db.execute(stmt)).scalars().all())

        await db.execute(
            delete(EventOptionRow).where(EventOptionRow.event_id == event_id)
        )

        by_cat: dict[str, list[VendorCandidateRow]] = {}
        for row in all_c:
            by_cat.setdefault(row.category, []).append(row)

        for cat, items in by_cat.items():
            ranked = sorted(
                items,
                key=lambda r: (
                    r.fit_score is not None,
                    r.fit_score or 0,
                    r.exa_score or 0,
                ),
                reverse=True,
            )
            summary: list[dict[str, Any]] = []
            for i, r in enumerate(ranked, start=1):
                live = await db.get(VendorCandidateRow, r.id)
                if live:
                    live.display_rank = i
                enr = r.enrichment or {}
                summary.append(
                    {
                        "rank": i,
                        "name": r.exa_name or enr.get("business_name") or r.url,
                        "url": r.url,
                        "category": r.category,
                        "fit_score": r.fit_score,
                        "fit_rationale": r.fit_rationale,
                        "exa_score": r.exa_score,
                        "phone": enr.get("phone"),
                        "email": enr.get("email"),
                        "address": enr.get("address"),
                        "stage": r.stage,
                        "scoring_meta": r.scoring_meta,
                    }
                )
            db.add(
                EventOptionRow(
                    event_id=event_id,
                    category=cat,
                    options_summary=summary,
                )
            )

        event = await db.get(EventRow, event_id)
        if event:
            event.status = "ready"
        await db.commit()

    logger.info("pipeline finalize complete", **stats)
    return stats
