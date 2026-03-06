from __future__ import annotations

from datetime import date, time
from enum import Enum

from pydantic import BaseModel, Field


class EventType(str, Enum):
    BIRTHDAY_PARTY = "birthday_party"


class EventStatus(str, Enum):
    INTAKE = "intake"
    PLANNING = "planning"
    RESEARCHING = "researching"
    READY = "ready"
    ARCHIVED = "archived"


class EventRequirements(BaseModel):
    """Structured requirements extracted by the conversation agent."""

    event_type: EventType = EventType.BIRTHDAY_PARTY
    child_name: str = ""
    child_age: int | None = None
    event_date: date | None = None
    event_time: time | None = None
    duration_hours: float = Field(default=2.0, ge=0.5, le=12.0)
    guest_count: int | None = Field(default=None, ge=1, le=500)
    zip_code: str = ""
    budget_low: float | None = None
    budget_high: float | None = None
    theme: str = ""
    dietary_restrictions: list[str] = Field(default_factory=list)
    notes: str = ""


class InboundMessage(BaseModel):
    """Parsed inbound WhatsApp message."""

    from_phone: str
    body: str
    message_sid: str
