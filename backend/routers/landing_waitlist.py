from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_session
from backend.logging_config import get_logger
from backend.models.db import LandingWaitlistRow

logger = get_logger(__name__)

router = APIRouter()

SUCCESS_BODY = {"message": "You're on the list."}


class LandingWaitlistSignupRequest(BaseModel):
    email: EmailStr

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

    row = LandingWaitlistRow(email=email)
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.info("landing_waitlist duplicate email", email=email)
        return LandingWaitlistSignupResponse(message=SUCCESS_BODY["message"])

    logger.info("landing_waitlist signup", email=email)
    return LandingWaitlistSignupResponse(message=SUCCESS_BODY["message"])
