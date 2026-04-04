from __future__ import annotations

import uuid
from urllib.parse import urlparse

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.query_formatter_agent import QueryFormatterAgent
from backend.logging_config import get_logger
from backend.models.db import EventRow, VendorSearchRow
from backend.models.vendor import VendorCategory, VendorSearchResult
from backend.services.search.exa_client import ExaSearchHit, search_vendors_multi

logger = get_logger(__name__)

_query_formatter = QueryFormatterAgent()


def _normalize_domain(url: str) -> str:
    """Extract a normalized domain from a URL for deduplication."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        return host.removeprefix("www.").lower()
    except Exception:
        return url.lower()


def _dedup_hits(hits: list[ExaSearchHit]) -> list[ExaSearchHit]:
    """Remove duplicate results based on domain, keeping the highest-scored."""
    seen: dict[str, ExaSearchHit] = {}
    for hit in hits:
        domain = _normalize_domain(hit.url)
        existing = seen.get(domain)
        if existing is None:
            seen[domain] = hit
        elif (hit.score or 0) > (existing.score or 0):
            seen[domain] = hit
    return list(seen.values())


def _rank_hits(hits: list[ExaSearchHit]) -> list[ExaSearchHit]:
    """Sort hits by Exa score descending."""
    return sorted(hits, key=lambda h: h.score or 0, reverse=True)


def _hit_to_vendor_result(
    hit: ExaSearchHit,
    category: VendorCategory,
) -> VendorSearchResult:
    """Convert an Exa hit to a VendorSearchResult."""
    description = ""
    if hit.highlights:
        description = " ".join(hit.highlights)
    elif hit.text:
        description = hit.text[:500]

    return VendorSearchResult(
        name=hit.title or _normalize_domain(hit.url),
        category=category,
        website=hit.url,
        source="exa",
        description=description,
        exa_url=hit.url,
        exa_score=hit.score,
    )


async def search_category(
    event_id: uuid.UUID,
    category: str,
    raw_queries: list[str],
    requirements: dict,
    db: AsyncSession,
) -> list[VendorSearchResult]:
    """Run the full search pipeline for a single vendor category.

    1. Format queries via LLM
    2. Run Exa searches concurrently
    3. Dedup and rank
    4. Persist to vendor_searches
    5. Return normalized results
    """
    vendor_cat = VendorCategory(category)

    logger.info(
        "search category start",
        event_id=str(event_id),
        category=category,
        raw_query_count=len(raw_queries),
    )

    formatted = await _query_formatter.format_queries(
        category=category,
        raw_queries=raw_queries,
        requirements=requirements,
    )

    logger.info(
        "queries formatted",
        category=category,
        formatted_count=len(formatted.queries),
        search_type=formatted.search_type,
    )

    all_hits = await search_vendors_multi(
        formatted.queries,
        num_results_per_query=10,
        search_type=formatted.search_type,
    )

    deduped = _dedup_hits(all_hits)
    ranked = _rank_hits(deduped)
    top_hits = ranked[:15]

    results = [_hit_to_vendor_result(hit, vendor_cat) for hit in top_hits]

    for query in formatted.queries:
        query_results = [
            r.model_dump(mode="json")
            for r in results
        ]
        search_row = VendorSearchRow(
            event_id=event_id,
            category=category,
            query=query,
            results=query_results,
        )
        db.add(search_row)

    await db.flush()

    logger.info(
        "search category complete",
        event_id=str(event_id),
        category=category,
        total_hits=len(all_hits),
        deduped_hits=len(deduped),
        returned=len(results),
    )

    return results


async def update_event_status(
    event_id: uuid.UUID,
    new_status: str,
    db: AsyncSession,
) -> None:
    """Update an event's status."""
    stmt = (
        update(EventRow)
        .where(EventRow.id == event_id)
        .values(status=new_status)
    )
    await db.execute(stmt)
    await db.flush()


async def check_all_categories_complete(
    event_id: uuid.UUID,
    db: AsyncSession,
) -> bool:
    """Check if all 4 vendor categories have search results."""
    stmt = (
        select(VendorSearchRow.category)
        .where(VendorSearchRow.event_id == event_id)
        .distinct()
    )
    result = await db.execute(stmt)
    categories = {row[0] for row in result.all()}
    all_cats = {c.value for c in VendorCategory}
    return all_cats.issubset(categories)
