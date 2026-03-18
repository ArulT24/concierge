from __future__ import annotations

import uuid

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import EventRow
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
    plan_summary: str | None = None


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
        progress=build_progress(collected, missing),
    )


async def _trigger_research_pipeline(
    session_id: str,
    requirements: dict,
    db: AsyncSession,
) -> str | None:
    """Run PlanningAgent and dispatch search tasks. Returns plan summary."""
    from backend.agents.planning_agent import PlanningAgent
    from backend.services.search.tasks import dispatch_research_plan

    try:
        event_id = uuid.UUID(session_id)
        event = await db.get(EventRow, event_id)
        if event:
            event.status = "planning"
            await db.flush()

        planner = PlanningAgent()
        req_lines = "\n".join(
            f"{k}: {v}" for k, v in requirements.items() if v
        )
        plan = await planner.run(
            [{"role": "user", "content": f"Plan research for this party:\n{req_lines}"}]
        )

        plan_dict = plan.model_dump(mode="json")
        dispatch_research_plan.delay(session_id, plan_dict, requirements)

        logger.info(
            "research pipeline triggered",
            session_id=session_id,
            task_count=len(plan.tasks),
            summary=plan.summary,
        )
        return plan.summary

    except Exception as exc:
        logger.error(
            "failed to trigger research pipeline",
            session_id=session_id,
            error=str(exc),
        )
        return None


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

    plan_summary: str | None = None
    if result.ready:
        requirements_dict = result.requirements.model_dump(mode="json")
        plan_summary = await _trigger_research_pipeline(
            session.session_id, requirements_dict, db,
        )

    logger.info(
        "conversation turn",
        session_id=session.session_id,
        ready=result.ready,
        reply_count=len(result.messages),
        search_dispatched=plan_summary is not None,
    )

    return ChatResponse(
        session_id=session.session_id,
        messages=result.messages,
        showWaitlist=result.ready,
        progress=build_progress(result.collected_fields, result.missing_fields),
        plan_summary=plan_summary,
    )
