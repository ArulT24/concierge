from __future__ import annotations

from collections.abc import Iterable
from threading import Lock
from uuid import uuid4

from pydantic import BaseModel, Field

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

    def append_messages(self, messages: Iterable[SessionMessage]) -> None:
        self.messages.extend(messages)


class ChatSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ChatSession] = {}
        self._lock = Lock()

    def create(self) -> ChatSession:
        session = ChatSession(session_id=str(uuid4()))
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> ChatSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def save(self, session: ChatSession) -> None:
        with self._lock:
            self._sessions[session.session_id] = session


session_store = ChatSessionStore()
