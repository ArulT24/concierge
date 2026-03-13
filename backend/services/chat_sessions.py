from __future__ import annotations

import uuid
from collections.abc import Iterable

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import EventRow, MessageRow
from backend.models.event_request import EventRequirements


class SessionMessage(BaseModel):
    role: str
    content: str


class ChatProgress(BaseModel):
    collected_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    completion_ratio: float = Field(default=0.0, ge=0.0, le=1.0)


class ChatSession(BaseModel):
    session_id: str
    requirements: EventRequirements = Field(default_factory=EventRequirements)
    messages: list[SessionMessage] = Field(default_factory=list)
    _new_messages: list[SessionMessage] = []

    model_config = {"arbitrary_types_allowed": True}

    def append_messages(self, messages: Iterable[SessionMessage]) -> None:
        new = list(messages)
        self.messages.extend(new)
        self._new_messages.extend(new)


class ChatSessionStore:
    """Postgres-backed session store using the events + messages tables."""

    async def create(self, db: AsyncSession) -> ChatSession:
        event = EventRow(
            user_phone="web-anonymous",
            event_type="birthday_party",
            status="intake",
            requirements={},
        )
        db.add(event)
        await db.flush()

        session_id = str(event.id)
        return ChatSession(session_id=session_id)

    async def get(self, session_id: str, db: AsyncSession) -> ChatSession | None:
        try:
            event_id = uuid.UUID(session_id)
        except ValueError:
            return None

        event = await db.get(EventRow, event_id)
        if event is None:
            return None

        stmt = (
            select(MessageRow)
            .where(MessageRow.event_id == event_id)
            .order_by(MessageRow.created_at)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()

        messages = [
            SessionMessage(
                role="user" if row.direction == "inbound" else "assistant",
                content=row.content,
            )
            for row in rows
        ]

        requirements = EventRequirements.model_validate(event.requirements) if event.requirements else EventRequirements()

        return ChatSession(
            session_id=session_id,
            requirements=requirements,
            messages=messages,
        )

    async def save(self, session: ChatSession, db: AsyncSession) -> None:
        event_id = uuid.UUID(session.session_id)
        event = await db.get(EventRow, event_id)
        if event is None:
            return

        event.requirements = session.requirements.model_dump(mode="json")

        for msg in session._new_messages:
            row = MessageRow(
                event_id=event_id,
                direction="inbound" if msg.role == "user" else "outbound",
                content=msg.content,
            )
            db.add(row)

        session._new_messages.clear()


session_store = ChatSessionStore()
