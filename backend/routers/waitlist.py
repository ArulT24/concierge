from __future__ import annotations

import uuid

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import EventRow

logger = get_logger(__name__)

router = APIRouter()


class WaitlistRequest(BaseModel):
    session_id: str
    email: str
    city: str


class WaitlistResponse(BaseModel):
    message: str
    session_id: str


class EventDetailsResponse(BaseModel):
    session_id: str
    email: str | None = None
    city: str | None = None
    status: str
    requirements: dict
    created_at: str


@router.post("/api/waitlist", response_model=WaitlistResponse)
async def join_waitlist(
    request: WaitlistRequest,
    db: AsyncSession = Depends(get_session),
) -> WaitlistResponse:
    try:
        event_id = uuid.UUID(request.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    event = await db.get(EventRow, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    event.email = request.email.strip()
    event.city = request.city.strip()

    logger.info(
        "waitlist signup",
        session_id=request.session_id,
        email=event.email,
        city=event.city,
    )

    return WaitlistResponse(
        message=f"Thanks! {event.email} from {event.city} is on the waitlist.",
        session_id=request.session_id,
    )


@router.get("/api/events/{session_id}", response_model=EventDetailsResponse)
async def get_event_details(
    session_id: str,
    db: AsyncSession = Depends(get_session),
) -> EventDetailsResponse:
    try:
        event_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID.")

    event = await db.get(EventRow, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    return EventDetailsResponse(
        session_id=session_id,
        email=event.email,
        city=event.city,
        status=event.status,
        requirements=event.requirements or {},
        created_at=event.created_at.isoformat() if event.created_at else "",
    )
