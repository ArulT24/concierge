from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.models.db import PartyPlanningAccessRow


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def has_party_planning_access(
    email: str | None,
    db: AsyncSession,
) -> bool:
    """True if this email should get the full kids party intake on web chat."""
    if not email or not email.strip():
        return False
    normalized = _normalize_email(email)
    settings = get_settings()
    allow = {
        _normalize_email(x)
        for x in settings.party_planning_allowlist_emails.split(",")
        if x.strip()
    }
    if normalized in allow:
        return True

    row = await db.get(PartyPlanningAccessRow, normalized)
    return row is not None
