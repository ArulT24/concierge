from __future__ import annotations

from fastapi import APIRouter, Depends, Form, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.twiml.messaging_response import MessagingResponse

from backend.database.connection import get_session
from backend.integrations.twilio_whatsapp import normalize_whatsapp_phone, twilio_whatsapp
from backend.logging_config import get_logger
from backend.models.event_request import InboundMessage
from backend.services.chat_sessions import SessionMessage, session_store
from backend.services.conversation_flow import process_incoming_message

logger = get_logger(__name__)

router = APIRouter()


def _empty_twiml_response() -> Response:
    return Response(
        content=str(MessagingResponse()),
        media_type="application/xml",
    )


@router.post("/webhooks/twilio/whatsapp")
async def receive_whatsapp_message(
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: str = Form(...),
    db: AsyncSession = Depends(get_session),
) -> Response:
    body = Body.strip()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body is required.",
        )

    try:
        inbound = InboundMessage(
            from_phone=normalize_whatsapp_phone(From),
            body=body,
            message_sid=MessageSid.strip(),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if await session_store.has_message_sid(inbound.message_sid, db):
        logger.info("duplicate whatsapp webhook ignored", message_sid=inbound.message_sid)
        return _empty_twiml_response()

    session = await session_store.get_or_create_by_phone(inbound.from_phone, db)
    result = await process_incoming_message(
        session,
        SessionMessage(
            role="user",
            content=inbound.body,
            sid=inbound.message_sid,
        ),
        db,
    )

    outbound_messages: list[SessionMessage] = []
    for message in result.messages:
        sid = await twilio_whatsapp.send_message(inbound.from_phone, message)
        outbound_messages.append(
            SessionMessage(role="assistant", content=message, sid=sid)
        )

    session.append_messages(outbound_messages)
    await session_store.save(session, db)

    logger.info(
        "processed whatsapp turn",
        session_id=session.session_id,
        phone=inbound.from_phone,
        inbound_sid=inbound.message_sid,
        outbound_count=len(outbound_messages),
        ready=result.ready,
    )
    return _empty_twiml_response()
