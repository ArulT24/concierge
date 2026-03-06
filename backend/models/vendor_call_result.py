from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ExtractedCallData(BaseModel):
    """Structured data pulled from a vendor call transcript."""

    available: bool | None = None
    available_dates: list[str] = Field(default_factory=list)
    pricing: dict[str, float] = Field(default_factory=dict)
    capacity: int | None = None
    restrictions: list[str] = Field(default_factory=list)
    contact_person: str = ""
    follow_up_needed: bool = False
    summary: str = ""


class VendorCallResult(BaseModel):
    """Full result of an automated vendor call."""

    vendor_name: str
    phone: str
    status: CallStatus = CallStatus.PENDING
    vapi_call_id: str = ""
    transcript: str = ""
    extracted_data: ExtractedCallData = Field(default_factory=ExtractedCallData)
    call_duration_seconds: int | None = None
