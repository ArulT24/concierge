"""
End-to-end test for the vendor search pipeline.

Tests the full flow: QueryFormatterAgent -> Exa search -> dedup -> results.
Does NOT require Celery/Redis — runs the orchestrator directly.

Usage:
    python -m backend.services.search.test_search

Requires EXA_API_KEY and OPENAI_API_KEY in .env or environment.
"""
from __future__ import annotations

import asyncio
import json
import uuid

from backend.agents.planning_agent import PlanningAgent
from backend.agents.query_formatter_agent import QueryFormatterAgent
from backend.services.search.exa_client import search_vendors


SAMPLE_REQUIREMENTS = {
    "child_name": "Emma",
    "child_age": 7,
    "event_date": "2026-04-15",
    "event_time": "14:00",
    "guest_count": 20,
    "zip_code": "78701",
    "budget_low": 300,
    "budget_high": 600,
    "theme": "unicorn",
    "venue_preferences": "indoor",
    "food_preferences": "pizza",
    "entertainment_preferences": "face painter",
    "decoration_preferences": "balloons and streamers",
}


async def test_query_formatter() -> None:
    """Test the QueryFormatterAgent in isolation."""
    print("\n── Test 1: QueryFormatterAgent ──")
    agent = QueryFormatterAgent()

    raw_queries = [
        "indoor kids birthday party venue near 78701",
        "unicorn themed party venue Austin TX",
    ]

    result = await agent.format_queries(
        category="venue",
        raw_queries=raw_queries,
        requirements=SAMPLE_REQUIREMENTS,
    )

    print(f"  Search type: {result.search_type}")
    print(f"  Formatted queries ({len(result.queries)}):")
    for i, q in enumerate(result.queries, 1):
        print(f"    {i}. {q}")
    print("  PASS")


async def test_exa_search() -> None:
    """Test a single Exa search call."""
    print("\n── Test 2: Exa Search (single query) ──")
    query = (
        "A kids birthday party venue in Austin TX 78701 that has indoor space "
        "for at least 20 children around age 7, unicorn or fantasy themed"
    )

    hits = await search_vendors(query, num_results=5, search_type="auto")

    print(f"  Hits returned: {len(hits)}")
    for hit in hits[:5]:
        score_str = f"{hit.score:.3f}" if hit.score else "N/A"
        print(f"    [{score_str}] {hit.title}")
        print(f"           {hit.url}")
        if hit.highlights:
            print(f"           {hit.highlights[0][:120]}...")
    print("  PASS")


async def test_planning_agent() -> None:
    """Test PlanningAgent producing a research plan."""
    print("\n── Test 3: PlanningAgent ──")
    planner = PlanningAgent()

    req_lines = "\n".join(f"{k}: {v}" for k, v in SAMPLE_REQUIREMENTS.items() if v)
    plan = await planner.run(
        [{"role": "user", "content": f"Plan research for this party:\n{req_lines}"}]
    )

    print(f"  Summary: {plan.summary}")
    print(f"  Tasks: {len(plan.tasks)}")
    for task in sorted(plan.tasks, key=lambda t: t.priority):
        print(f"    [{task.priority}] {task.category.value}: {len(task.search_queries)} queries")
    print("  PASS")
    return plan


async def test_full_pipeline() -> None:
    """Run the full pipeline: plan -> format -> search for one category."""
    print("\n── Test 4: Full Pipeline (venue category only) ──")

    planner = PlanningAgent()
    formatter = QueryFormatterAgent()

    req_lines = "\n".join(f"{k}: {v}" for k, v in SAMPLE_REQUIREMENTS.items() if v)
    plan = await planner.run(
        [{"role": "user", "content": f"Plan research for this party:\n{req_lines}"}]
    )

    venue_task = next((t for t in plan.tasks if t.category.value == "venue"), None)
    if not venue_task:
        print("  No venue task in plan — skipping")
        return

    formatted = await formatter.format_queries(
        category="venue",
        raw_queries=venue_task.search_queries,
        requirements=SAMPLE_REQUIREMENTS,
    )

    print(f"  Formatted {len(formatted.queries)} queries")

    all_hits = []
    for q in formatted.queries:
        hits = await search_vendors(q, num_results=5, search_type=formatted.search_type)
        all_hits.extend(hits)
        print(f"    Query: {q[:80]}... -> {len(hits)} hits")

    seen_domains: set[str] = set()
    unique_hits = []
    for hit in all_hits:
        from urllib.parse import urlparse
        domain = urlparse(hit.url).hostname or ""
        if domain not in seen_domains:
            seen_domains.add(domain)
            unique_hits.append(hit)

    unique_hits.sort(key=lambda h: h.score or 0, reverse=True)

    print(f"\n  Total hits: {len(all_hits)}, Unique: {len(unique_hits)}")
    print("  Top 5 results:")
    for hit in unique_hits[:5]:
        score_str = f"{hit.score:.3f}" if hit.score else "N/A"
        print(f"    [{score_str}] {hit.title}")
        print(f"           {hit.url}")
    print("  PASS")


async def main() -> None:
    print("=" * 60)
    print("  Vendor Search Pipeline — End-to-End Test")
    print("=" * 60)

    tests = [
        ("QueryFormatterAgent", test_query_formatter),
        ("Exa Search", test_exa_search),
        ("PlanningAgent", test_planning_agent),
        ("Full Pipeline", test_full_pipeline),
    ]

    for name, test_fn in tests:
        try:
            await test_fn()
        except Exception as exc:
            print(f"\n  FAIL: {name} — {exc}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("  All tests complete.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
