from __future__ import annotations

import resend

from backend.config import get_settings
from backend.logging_config import get_logger

logger = get_logger(__name__)

WAITLIST_CONFIRMATION_SUBJECT = "You're on the Bertram waitlist"


def _sender() -> str | None:
    settings = get_settings()
    from_email = settings.resend_from_email.strip()
    if not from_email:
        return None

    from_name = settings.resend_from_name.strip()
    if from_name:
        return f"{from_name} <{from_email}>"
    return from_email


def send_waitlist_confirmation_email(recipient_email: str) -> str | None:
    settings = get_settings()
    api_key = settings.resend_api_key.strip()
    sender = _sender()
    recipient = recipient_email.strip().lower()

    if not recipient:
        logger.info("waitlist confirmation skipped: missing recipient email")
        return None

    if not api_key or not sender:
        logger.warning(
            "waitlist confirmation skipped: resend not configured",
            has_api_key=bool(api_key),
            has_sender=bool(sender),
        )
        return None

    resend.api_key = api_key
    params: resend.Emails.SendParams = {
        "from": sender,
        "to": [recipient],
        "subject": WAITLIST_CONFIRMATION_SUBJECT,
        "text": (
            "You're on the Bertram waitlist.\n\n"
            "We'll reach out when Bertram is ready for you."
        ),
        "html": (
            "<p>You're on the Bertram waitlist.</p>"
            "<p>We'll reach out when Bertram is ready for you.</p>"
        ),
    }
    response = resend.Emails.send(params)
    email_id = response.get("id") if isinstance(response, dict) else None

    logger.info(
        "waitlist confirmation sent",
        recipient_email=recipient,
        resend_email_id=email_id,
    )
    return email_id
