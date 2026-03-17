from __future__ import annotations

from fastapi.concurrency import run_in_threadpool
from twilio.rest import Client

from backend.config import get_settings


def normalize_whatsapp_phone(phone: str) -> str:
    normalized = phone.strip()
    if not normalized:
        raise ValueError("Phone number is required.")
    if normalized.startswith("whatsapp:"):
        return normalized
    return f"whatsapp:{normalized}"


class TwilioWhatsAppClient:
    def __init__(self) -> None:
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is None:
            settings = get_settings()
            if not settings.twilio_account_sid or not settings.twilio_auth_token:
                raise RuntimeError("Twilio credentials are not configured.")
            self._client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token,
            )
        return self._client

    async def send_message(self, to_phone: str, body: str) -> str:
        settings = get_settings()
        if not settings.twilio_whatsapp_from:
            raise RuntimeError("Twilio WhatsApp sender is not configured.")

        message = await run_in_threadpool(
            lambda: self._get_client().messages.create(
                from_=settings.twilio_whatsapp_from,
                to=normalize_whatsapp_phone(to_phone),
                body=body,
            )
        )
        return str(message.sid)


twilio_whatsapp = TwilioWhatsAppClient()
