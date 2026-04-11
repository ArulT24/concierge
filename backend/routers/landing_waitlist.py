from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import LandingWaitlistRow

logger = get_logger(__name__)

router = APIRouter()


class LandingWaitlistSignupRequest(BaseModel):
    # At least one of email or phone_number must be provided.
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    planning_interest: str | None = None
    event_category: str | None = None
    intake_answers: dict | None = None
    referred_by: str | None = None

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip() or None
        return v

    @field_validator("phone_number", mode="before")
    @classmethod
    def strip_phone(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip() or None
        return v


class LandingWaitlistSignupResponse(BaseModel):
    message: str
    referral_code: str
    referral_count: int


class LandingWaitlistCheckResponse(BaseModel):
    on_waitlist: bool
    referral_code: str | None = None
    referral_count: int = 0


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_phone(phone: str) -> str:
    return phone.strip()


def _generate_referral_code() -> str:
    return uuid.uuid4().hex[:10]


async def upsert_landing_waitlist(
    db: AsyncSession,
    email: str | None = None,
    phone_number: str | None = None,
    planning_interest: str | None = None,
    event_category: str | None = None,
    intake_answers: dict | None = None,
    referred_by: str | None = None,
) -> tuple[str, int]:
    """Insert or update a landing_waitlist row. Returns (referral_code, referral_count)."""
    if not email and not phone_number:
        return ("", 0)

    # Look up existing row by email (preferred) or phone_number
    existing: LandingWaitlistRow | None = None
    if email:
        result = await db.execute(
            select(LandingWaitlistRow).where(LandingWaitlistRow.email == email)
        )
        existing = result.scalar_one_or_none()

    if existing is None and phone_number:
        result = await db.execute(
            select(LandingWaitlistRow).where(LandingWaitlistRow.phone_number == phone_number)
        )
        existing = result.scalar_one_or_none()

    if existing is not None:
        if planning_interest:
            existing.planning_interest = planning_interest.strip()
        if event_category:
            existing.event_category = event_category.strip()
        if intake_answers:
            existing.intake_answers = intake_answers
        # Backfill phone_number if we now have it and it wasn't set before
        if phone_number and not existing.phone_number:
            existing.phone_number = phone_number
        # Backfill referral code for rows created before this feature shipped
        if not existing.referral_code:
            existing.referral_code = _generate_referral_code()
        identifier = email or phone_number
        logger.info("landing_waitlist updated", identifier=identifier)
        await db.flush()
        return (existing.referral_code, existing.referral_count)

    # New signup
    referral_code = _generate_referral_code()
    row = LandingWaitlistRow(
        email=email,
        phone_number=phone_number,
        planning_interest=planning_interest.strip() if planning_interest else None,
        event_category=event_category.strip() if event_category else None,
        intake_answers=intake_answers,
        referral_code=referral_code,
        referred_by=referred_by.strip() if referred_by else None,
    )
    db.add(row)
    await db.flush()
    identifier = email or phone_number
    logger.info("landing_waitlist signup", identifier=identifier, referral_code=referral_code)

    # Credit the referrer if a valid referred_by code was provided
    if referred_by:
        await db.execute(
            update(LandingWaitlistRow)
            .where(LandingWaitlistRow.referral_code == referred_by.strip())
            .values(referral_count=LandingWaitlistRow.referral_count + 1)
        )
        await db.flush()

    return (referral_code, 0)


@router.get(
    "/api/landing-waitlist",
    response_model=LandingWaitlistCheckResponse,
)
async def check_landing_waitlist(
    email: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    db: AsyncSession = Depends(get_session),
) -> LandingWaitlistCheckResponse:
    if not email and not phone:
        raise HTTPException(status_code=400, detail="email or phone query parameter is required.")

    existing: LandingWaitlistRow | None = None

    if email:
        normalized = _normalize_email(email)
        result = await db.execute(
            select(LandingWaitlistRow).where(LandingWaitlistRow.email == normalized)
        )
        existing = result.scalar_one_or_none()

    if existing is None and phone:
        normalized_phone = _normalize_phone(phone)
        result = await db.execute(
            select(LandingWaitlistRow).where(LandingWaitlistRow.phone_number == normalized_phone)
        )
        existing = result.scalar_one_or_none()

    if existing is None:
        return LandingWaitlistCheckResponse(on_waitlist=False)
    return LandingWaitlistCheckResponse(
        on_waitlist=True,
        referral_code=existing.referral_code,
        referral_count=existing.referral_count,
    )


@router.post(
    "/api/landing-waitlist",
    response_model=LandingWaitlistSignupResponse,
)
async def signup_landing_waitlist(
    body: LandingWaitlistSignupRequest,
    db: AsyncSession = Depends(get_session),
) -> LandingWaitlistSignupResponse:
    email = _normalize_email(str(body.email)) if body.email else None
    phone_number = _normalize_phone(body.phone_number) if body.phone_number else None

    if not email and not phone_number:
        raise HTTPException(status_code=400, detail="email or phone_number is required.")

    referral_code, referral_count = await upsert_landing_waitlist(
        db=db,
        email=email,
        phone_number=phone_number,
        planning_interest=body.planning_interest,
        event_category=body.event_category,
        intake_answers=body.intake_answers,
        referred_by=body.referred_by,
    )
    return LandingWaitlistSignupResponse(
        message="You're on the list.",
        referral_code=referral_code,
        referral_count=referral_count,
    )
