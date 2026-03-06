from __future__ import annotations

from pydantic import BaseModel, Field


class VenueSearchResult(BaseModel):
    """Single venue returned from a search provider."""

    name: str
    address: str = ""
    phone: str = ""
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int = 0
    price_level: str = ""
    website: str = ""
    source: str = ""
    photos_url: str = ""


class VenueOption(BaseModel):
    """Enriched venue option after calling and research."""

    search_result: VenueSearchResult
    available: bool | None = None
    quoted_price: float | None = None
    capacity: int | None = None
    restrictions: list[str] = Field(default_factory=list)
    contact_person: str = ""
    call_notes: str = ""
