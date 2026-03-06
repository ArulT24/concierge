from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class VendorCategory(str, Enum):
    VENUE = "venue"
    ENTERTAINMENT = "entertainment"
    CAKE = "cake"
    DECORATION = "decoration"


class VendorSearchResult(BaseModel):
    """Generic vendor from search (entertainment, bakery, etc.)."""

    name: str
    category: VendorCategory
    address: str = ""
    phone: str = ""
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int = 0
    price_level: str = ""
    website: str = ""
    source: str = ""
    description: str = ""


class VendorOption(BaseModel):
    """Enriched vendor option after calling."""

    search_result: VendorSearchResult
    available: bool | None = None
    quoted_price: float | None = None
    service_details: str = ""
    contact_person: str = ""
    call_notes: str = ""
