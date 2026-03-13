from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from backend.agents.conversation_agent import ConversationAgent
from backend.logging_config import get_logger
from backend.services.chat_sessions import ChatProgress, SessionMessage, session_store

logger = get_logger(__name__)

router = APIRouter()

_agent = ConversationAgent()


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    messages: list[str]
    showWaitlist: bool
    progress: ChatProgress


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if not request.session_id:
        session = session_store.create()
        opening_messages = _agent.initial_messages()
        session.append_messages(
            SessionMessage(role="assistant", content=message)
            for message in opening_messages
        )
        session_store.save(session)
        progress = _build_progress(
            _agent._collected_fields(session.requirements),
            _agent._missing_fields(session.requirements),
        )
        return ChatResponse(
            session_id=session.session_id,
            messages=opening_messages,
            showWaitlist=False,
            progress=progress,
        )

    session = session_store.get(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    session.append_messages(
        [SessionMessage(role="user", content=request.message.strip())]
    )

    result = await _agent.run(
        [message.model_dump() for message in session.messages],
        current_requirements=session.requirements,
    )

    session.requirements = result.requirements
    session.append_messages(
        SessionMessage(role="assistant", content=message)
        for message in result.messages
    )
    session_store.save(session)

    logger.info(
        "conversation turn",
        session_id=session.session_id,
        ready=result.ready,
        reply_count=len(result.messages),
    )

    return ChatResponse(
        session_id=session.session_id,
        messages=result.messages,
        showWaitlist=result.ready,
        progress=_build_progress(result.collected_fields, result.missing_fields),
    )


def _build_progress(
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
