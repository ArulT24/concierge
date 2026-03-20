"""Derive top Exa URLs per category from persisted vendor_searches rows."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import VendorSearchRow

TOP_URLS_PER_CATEGORY = 10


@dataclass(frozen=True)
class ShortlistEntry:
    url: str
    exa_name: str
    exa_description: str
    exa_score: float | None


async def load_search_rows(
    db: AsyncSession,
    event_id: uuid.UUID,
) -> list[VendorSearchRow]:
    stmt = (
        select(VendorSearchRow)
        .where(VendorSearchRow.event_id == event_id)
        .order_by(VendorSearchRow.created_at)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


def shortlist_from_rows(
    rows: list[VendorSearchRow],
    *,
    per_category: int = TOP_URLS_PER_CATEGORY,
) -> dict[str, list[ShortlistEntry]]:
    """Best Exa hit per URL per category, then top ``per_category`` by score."""
    best: dict[str, dict[str, ShortlistEntry]] = {}

    for row in rows:
        cat = str(row.category)
        if not isinstance(row.results, list):
            continue
        bucket = best.setdefault(cat, {})
        for r in row.results:
            url = (r.get("website") or r.get("exa_url") or "").strip()
            if not url:
                continue
            raw_score = r.get("exa_score")
            score = float(raw_score) if raw_score is not None else None
            name = (r.get("name") or "")[:500]
            desc = (r.get("description") or "")[:2000]
            prev = bucket.get(url)
            prev_s = prev.exa_score if prev else None
            if prev is None or (score or 0) > (prev_s or 0):
                bucket[url] = ShortlistEntry(
                    url=url,
                    exa_name=name,
                    exa_description=desc,
                    exa_score=score,
                )

    out: dict[str, list[ShortlistEntry]] = {}
    for cat, m in best.items():
        items = sorted(
            m.values(),
            key=lambda e: e.exa_score or 0.0,
            reverse=True,
        )[:per_category]
        out[cat] = items
    return out
