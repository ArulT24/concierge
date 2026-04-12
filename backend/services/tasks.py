from __future__ import annotations

from backend.celery_app import celery
from backend.logging_config import get_logger
from backend.services.email import send_waitlist_confirmation_email

logger = get_logger(__name__)


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def send_waitlist_confirmation_email_task(self, email: str) -> dict:
    recipient = email.strip().lower()

    if not recipient:
        logger.info("waitlist confirmation task skipped: empty email")
        return {"sent": False, "reason": "missing_email"}

    try:
        email_id = send_waitlist_confirmation_email(recipient)
        return {
            "sent": bool(email_id),
            "email": recipient,
            "provider_id": email_id,
        }
    except Exception as exc:
        logger.error(
            "waitlist confirmation task failed",
            email=recipient,
            error=str(exc),
            attempt=self.request.retries + 1,
        )
        raise self.retry(exc=exc)
