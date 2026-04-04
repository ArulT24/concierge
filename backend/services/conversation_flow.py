from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.conversation_agent import ConversationAgent, ConversationResult
from backend.services.chat_sessions import ChatProgress, ChatSession, SessionMessage, session_store

_agent = ConversationAgent()


async def start_session(
    session: ChatSession,
    db: AsyncSession,
) -> tuple[list[str], ChatProgress]:
    opening_messages = _agent.initial_messages()
    session.append_messages(
        SessionMessage(role="assistant", content=message) for message in opening_messages
    )
    await session_store.save(session, db)
    progress = build_progress(
        _agent._collected_fields(session.requirements),
        _agent._missing_fields(session.requirements),
    )
    return opening_messages, progress


async def process_incoming_message(
    session: ChatSession,
    user_message: SessionMessage,
    db: AsyncSession,
) -> ConversationResult:
    session.append_messages([user_message])
    await session_store.save(session, db)

    if session.event_type == "waitlist_survey":
        from backend.services.waitlist_survey_flow import process_waitlist_survey_message

        return await process_waitlist_survey_message(session, db)

    result = await _agent.run(
        [message.model_dump(exclude_none=True) for message in session.messages],
        current_requirements=session.requirements,
    )
    session.requirements = result.requirements
    return result


def build_progress(
    collected_fields: list[str],
    missing_fields: list[str],
) -> ChatProgress:
    total_fields = len(collected_fields) + len(missing_fields)
    completion_ratio = len(collected_fields) / total_fields if total_fields else 1.0
    return ChatProgress(
        collected_fields=collected_fields,
        missing_fields=missing_fields,
        completion_ratio=completion_ratio,
    )
