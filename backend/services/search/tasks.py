from __future__ import annotations

import asyncio
import uuid

from celery import chord, group

from backend.celery_app import celery
from backend.database.connection import dispose_engine, get_session_factory
from backend.logging_config import get_logger
from backend.services.search.search_orchestrator import (
    search_category,
    update_event_status,
)

logger = get_logger(__name__)


async def _run_search_and_check(
    event_id_str: str,
    category: str,
    raw_queries: list[str],
    requirements: dict,
) -> int:
    """All async work for a single category in one coroutine.

    Combines search + status check + engine cleanup so we only call
    asyncio.run() once per task, avoiding event-loop-closed errors
    when SQLAlchemy's pool tears down connections.
    """
    event_id = uuid.UUID(event_id_str)
    factory = get_session_factory()

    try:
        async with factory() as db:
            try:
                results = await search_category(
                    event_id=event_id,
                    category=category,
                    raw_queries=raw_queries,
                    requirements=requirements,
                    db=db,
                )
                await db.commit()
                count = len(results)
            except Exception:
                await db.rollback()
                raise

        async with factory() as db:
            try:
                # Pipeline completion (enrich + score → ready) runs in Celery chord callback.
                await db.commit()
            except Exception:
                await db.rollback()
                raise

        logger.info(
            "vendor search persisted",
            event_id=event_id_str,
            category=category,
            result_count=count,
        )
        return count

    finally:
        await dispose_engine()


async def _set_researching_and_cleanup(event_id_str: str) -> None:
    """Set event status to researching, then dispose the engine."""
    eid = uuid.UUID(event_id_str)
    factory = get_session_factory()
    try:
        async with factory() as db:
            try:
                await update_event_status(eid, "researching", db)
                await db.commit()
            except Exception:
                await db.rollback()
                raise
    finally:
        await dispose_engine()


@celery.task(bind=True, max_retries=2, default_retry_delay=30)
def run_vendor_search(
    self,
    event_id: str,
    category: str,
    raw_queries: list[str],
    requirements: dict,
) -> dict:
    """Celery task: search a single vendor category via Exa."""
    logger.info(
        "celery task started",
        task_id=self.request.id,
        event_id=event_id,
        category=category,
    )

    try:
        count = asyncio.run(
            _run_search_and_check(event_id, category, raw_queries, requirements)
        )

        return {
            "event_id": event_id,
            "category": category,
            "result_count": count,
        }

    except Exception as exc:
        logger.error(
            "vendor search task failed",
            event_id=event_id,
            category=category,
            error=str(exc),
            attempt=self.request.retries + 1,
        )
        raise self.retry(exc=exc)


@celery.task
def dispatch_research_plan(
    event_id: str,
    plan: dict,
    requirements: dict,
) -> dict:
    """Fan out search tasks for all categories in a research plan."""
    tasks_data = plan.get("tasks", [])
    if not tasks_data:
        logger.warning("empty research plan", event_id=event_id)
        return {"event_id": event_id, "dispatched": 0}

    asyncio.run(_set_researching_and_cleanup(event_id))

    search_tasks = []
    for task in tasks_data:
        search_tasks.append(
            run_vendor_search.s(
                event_id,
                task["category"],
                task["search_queries"],
                requirements,
            )
        )

    header = group(search_tasks)
    chord(header)(
        finalize_vendor_pipeline.s(event_id, requirements or {}),
    ).apply_async()

    logger.info(
        "research plan dispatched (with post-search pipeline chord)",
        event_id=event_id,
        categories=[t["category"] for t in tasks_data],
    )

    return {
        "event_id": event_id,
        "dispatched": len(search_tasks),
    }


@celery.task(time_limit=3600, soft_time_limit=3300)
def finalize_vendor_pipeline(
    group_results: list | None,
    event_id: str,
    requirements: dict | None = None,
) -> dict:
    """After all Exa searches finish: shortlist, Browserbase, Anthropic, event_options."""
    import asyncio
    import uuid as uuid_mod

    from backend.services.pipeline.finalize import run_pipeline_for_event

    logger.info(
        "pipeline finalize task started",
        event_id=event_id,
        prior_tasks=len(group_results or []),
    )
    try:
        result = asyncio.run(
            run_pipeline_for_event(
                uuid_mod.UUID(event_id),
                requirements or {},
            )
        )
        logger.info("pipeline finalize task done", **{k: v for k, v in result.items() if k != "errors"})
        return result
    except Exception as exc:
        logger.error("pipeline finalize task failed", event_id=event_id, error=str(exc))
        raise
