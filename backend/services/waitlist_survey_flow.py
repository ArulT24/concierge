from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.conversation_agent import ConversationResult
from backend.agents.waitlist_survey_agent import WaitlistSurveyAgent
from backend.config import get_settings
from backend.logging_config import get_logger
from backend.models.db import EventRow
from backend.services.chat_sessions import (
    ChatProgress,
    ChatSession,
    SessionMessage,
    session_store,
)

logger = get_logger(__name__)

OPENING_MESSAGES: list[str] = [
    (
        "Hi, I am Bertram. Due to demand, I have to put you on the waitlist for now. "
        "I will send you an email once you are off the waitlist."
    ),
    (
        "In the meantime, I would love to understand what type of planning you would have me do."
    ),
    (
        "Here are some examples of what I can help you plan:\n\n"
        "• a birthday party\n"
        "• a holiday or family event\n"
        "• a travel itinerary"
    ),
    "Let me know what plans you have coming up and how I can help!",
]


def _keyword_category(text: str) -> str:
    t = text.lower()
    if any(
        w in t
        for w in (
            "travel",
            "trip",
            "itinerary",
            "vacation",
            "flight",
            "hotel",
            "portugal",
            "spain",
            "europe",
            "abroad",
        )
    ):
        return "travel"
    if any(
        w in t
        for w in (
            "birthday",
            "turning",
            "kids party",
            "kid's party",
            "cake",
            "balloon",
        )
    ):
        return "birthday_party"
    if any(
        w in t
        for w in (
            "holiday",
            "thanksgiving",
            "christmas",
            "reunion",
            "family event",
            "gathering",
        )
    ):
        return "holiday_or_family"
    return "other"


async def _fallback_reply(user_text: str) -> tuple[str, str]:
    cat = _keyword_category(user_text)
    body = (
        "Awesome! I would love to make that happen for you. "
        "I'll let you know once you're off the waitlist and we can get to planning!"
    )
    return body, cat


async def start_waitlist_survey_session(
    session: ChatSession,
    db: AsyncSession,
) -> tuple[list[str], ChatProgress]:
    session.append_messages(
        SessionMessage(role="assistant", content=text) for text in OPENING_MESSAGES
    )
    await session_store.save(session, db)
    progress = ChatProgress(
        collected_fields=[],
        missing_fields=[],
        completion_ratio=0.0,
    )
    return OPENING_MESSAGES, progress


async def process_waitlist_survey_message(
    session: ChatSession,
    db: AsyncSession,
) -> ConversationResult:
    user_messages = [m for m in session.messages if m.role == "user"]
    last_user = user_messages[-1].content if user_messages else ""

    event_id_u = uuid.UUID(session.session_id)
    event = await db.get(EventRow, event_id_u)
    if event is None:
        return ConversationResult(
            ready=False,
            messages=["Something went wrong — please refresh and try again."],
            requirements=session.requirements,
            missing_fields=[],
            collected_fields=[],
        )

    if event.planning_interest_raw:
        event.planning_interest_raw = f"{event.planning_interest_raw}\n\n{last_user}"
    else:
        event.planning_interest_raw = last_user

    if event.waitlist_survey_completed_at is None and last_user.strip():
        event.waitlist_survey_completed_at = datetime.now(timezone.utc)

    reply: str
    category: str
    if get_settings().openai_api_key.strip():
        agent = WaitlistSurveyAgent()
        transcript = [
            {"role": m.role, "content": m.content} for m in session.messages
        ]
        try:
            turn = await agent.run(transcript)
            reply = turn.reply
            category = turn.interest_category
        except Exception as exc:
            logger.warning("waitlist survey agent failed; using fallback", error=str(exc))
            reply, category = await _fallback_reply(last_user)
    else:
        reply, category = await _fallback_reply(last_user)

    event.planning_interest_category = category
    await db.flush()

    logger.info(
        "waitlist survey turn",
        session_id=session.session_id,
        interest_category=category,
    )

    return ConversationResult(
        ready=False,
        messages=[reply],
        requirements=session.requirements,
        missing_fields=[],
        collected_fields=[],
    )
