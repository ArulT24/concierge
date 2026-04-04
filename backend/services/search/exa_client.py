from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from exa_py import Exa

from backend.config import get_settings
from backend.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class ExaSearchHit:
    """A single search result from Exa."""

    title: str
    url: str
    score: float | None = None
    published_date: str | None = None
    author: str | None = None
    highlights: list[str] = field(default_factory=list)
    text: str = ""


def _get_client() -> Exa:
    settings = get_settings()
    if not settings.exa_api_key:
        raise RuntimeError("EXA_API_KEY is not set")
    return Exa(api_key=settings.exa_api_key)


async def search_vendors(
    query: str,
    *,
    num_results: int = 10,
    search_type: str = "auto",
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
    category: str | None = "company",
) -> list[ExaSearchHit]:
    """Run a single Exa search and return structured hits.

    The exa-py SDK is synchronous, so we run it in a thread pool
    to avoid blocking the event loop.
    """
    client = _get_client()

    def _do_search() -> list[ExaSearchHit]:
        kwargs: dict = {
            "query": query,
            "num_results": num_results,
            "type": search_type,
            "contents": {
                "text": {"max_characters": 3000},
                "highlights": {"num_sentences": 3},
            },
        }
        if include_domains:
            kwargs["include_domains"] = include_domains
        if exclude_domains:
            kwargs["exclude_domains"] = exclude_domains
        if category:
            kwargs["category"] = category

        response = client.search(**kwargs)

        hits: list[ExaSearchHit] = []
        for result in response.results:
            hits.append(
                ExaSearchHit(
                    title=result.title or "",
                    url=result.url,
                    score=result.score,
                    published_date=result.published_date,
                    author=result.author,
                    highlights=getattr(result, "highlights", []) or [],
                    text=getattr(result, "text", "") or "",
                )
            )
        return hits

    loop = asyncio.get_running_loop()
    hits = await loop.run_in_executor(None, _do_search)

    logger.info(
        "exa search complete",
        query=query[:80],
        search_type=search_type,
        num_hits=len(hits),
    )
    return hits


async def search_vendors_multi(
    queries: list[str],
    *,
    num_results_per_query: int = 10,
    search_type: str = "auto",
    category: str | None = "company",
) -> list[ExaSearchHit]:
    """Run multiple Exa searches concurrently and merge results."""
    tasks = [
        search_vendors(
            q,
            num_results=num_results_per_query,
            search_type=search_type,
            category=category,
        )
        for q in queries
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_hits: list[ExaSearchHit] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error("exa search failed", query=queries[i][:80], error=str(result))
            continue
        all_hits.extend(result)

    return all_hits
