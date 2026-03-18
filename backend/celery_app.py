from __future__ import annotations

from celery import Celery

from backend.config import get_settings

settings = get_settings()

celery = Celery(
    "concierge",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=86400,  # 24 hours
    task_routes={
        "backend.workflows.*": {"queue": "workflows"},
        "backend.agents.*": {"queue": "agents"},
        "backend.services.vendor_call_service.*": {"queue": "calls"},
        "backend.services.search.*": {"queue": "searches"},
    },
)

celery.autodiscover_tasks(
    [
        "backend.workflows",
        "backend.agents",
        "backend.services",
        "backend.services.search",
    ]
)
