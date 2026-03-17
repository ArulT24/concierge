from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.services.chat_sessions import ChatProgress, SessionMessage, session_store
from backend.services.conversation_flow import build_progress, process_incoming_message, start_session

logger = get_logger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    messages: list[str]
    showWaitlist: bool
    progress: ChatProgress


class SessionHistoryMessage(BaseModel):
    role: str
    content: str


class SessionResumeResponse(BaseModel):
    session_id: str
    messages: list[SessionHistoryMessage]
    showWaitlist: bool
    progress: ChatProgress


@router.get("/api/chat/{session_id}", response_model=SessionResumeResponse)
async def resume_session(
    session_id: str,
    db: AsyncSession = Depends(get_session),
) -> SessionResumeResponse:
    session = await session_store.get(session_id, db)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    from backend.agents.conversation_agent import ConversationAgent

    agent = ConversationAgent()
    missing = agent._missing_fields(session.requirements)
    collected = agent._collected_fields(session.requirements)
    ready = len(missing) == 0

    return SessionResumeResponse(
        session_id=session.session_id,
        messages=[
            SessionHistoryMessage(role=m.role, content=m.content)
            for m in session.messages
        ],
        showWaitlist=ready,
        progress=_build_progress(collected, missing),
    )


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_session),
) -> ChatResponse:
    if not request.session_id:
        session = await session_store.create(db)
        opening_messages, progress = await start_session(session, db)
        return ChatResponse(
            session_id=session.session_id,
            messages=opening_messages,
            showWaitlist=False,
            progress=progress,
        )

    session = await session_store.get(request.session_id, db)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    result = await process_incoming_message(
        session,
        SessionMessage(role="user", content=request.message.strip()),
        db,
    )
    session.append_messages(
        SessionMessage(role="assistant", content=message)
        for message in result.messages
    )
    await session_store.save(session, db)

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
        progress=build_progress(result.collected_fields, result.missing_fields),
    )
