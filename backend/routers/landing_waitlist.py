from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import LandingWaitlistRow

logger = get_logger(__name__)

router = APIRouter()

SUCCESS_BODY = {"message": "You're on the list."}


class LandingWaitlistSignupRequest(BaseModel):
    email: EmailStr
    planning_interest: str | None = None

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class LandingWaitlistSignupResponse(BaseModel):
    message: str


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def upsert_landing_waitlist(
    email: str,
    db: AsyncSession,
    planning_interest: str | None = None,
) -> None:
    """Insert or update a landing_waitlist row. Safe to call multiple times."""
    email = _normalize_email(email)
    if not email:
        return

    result = await db.execute(
        select(LandingWaitlistRow).where(LandingWaitlistRow.email == email)
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        if planning_interest:
            existing.planning_interest = planning_interest.strip()
        logger.info("landing_waitlist updated", email=email)
    else:
        interest = planning_interest.strip() if planning_interest else None
        db.add(LandingWaitlistRow(email=email, planning_interest=interest))
        logger.info("landing_waitlist signup", email=email)

    await db.flush()


@router.post(
    "/api/landing-waitlist",
    response_model=LandingWaitlistSignupResponse,
)
async def signup_landing_waitlist(
    body: LandingWaitlistSignupRequest,
    db: AsyncSession = Depends(get_session),
) -> LandingWaitlistSignupResponse:
    email = _normalize_email(str(body.email))
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    await upsert_landing_waitlist(
        email=email,
        db=db,
        planning_interest=body.planning_interest,
    )
    return LandingWaitlistSignupResponse(message=SUCCESS_BODY["message"])
