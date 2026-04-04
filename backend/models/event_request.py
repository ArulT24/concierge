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


SEARCH_MINIMUM_FIELDS = {
    "zip_code": "We need a location to search for vendors.",
    "guest_count": "We need a guest count to find appropriately sized venues.",
    "child_age": "We need the child's age to find age-appropriate options.",
    "theme": "We need a theme to tailor the search results.",
}


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
    venue_preferences: str = ""
    budget_low: float | None = None
    budget_high: float | None = None
    theme: str = ""
    food_preferences: str = ""
    snack_preferences: str = ""
    decoration_preferences: str = ""
    entertainment_preferences: str = ""
    dietary_restrictions: list[str] = Field(default_factory=list)
    notes: str = ""

    def missing_search_field_names(self) -> list[str]:
        """Field names still missing for a useful vendor search (deterministic)."""
        missing: list[str] = []
        for field_name in SEARCH_MINIMUM_FIELDS:
            value = getattr(self, field_name, None)
            if value is None or (isinstance(value, str) and not value.strip()):
                missing.append(field_name)
        return missing

    def search_ready(self) -> tuple[bool, list[str]]:
        """Check if we have enough info to run a useful vendor search.

        Returns (is_ready, list_of_missing_reason_strings).
        """
        names = self.missing_search_field_names()
        reasons = [SEARCH_MINIMUM_FIELDS[n] for n in names]
        return len(names) == 0, reasons


class InboundMessage(BaseModel):
    """Parsed inbound WhatsApp message."""

    from_phone: str
    body: str
    message_sid: str
