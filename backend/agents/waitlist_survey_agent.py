from __future__ import annotations

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent

VALID_CATEGORIES = frozenset(
    {"birthday_party", "holiday_or_family", "travel", "other"}
)


SYSTEM_PROMPT = """\
You are Bertram, a friendly planning assistant. The user is on a **waitlist** — they do \
not have full product access yet.

Your visible reply to the user must be **only** a warm, specific acknowledgment of what they \
just shared (party, trip, holiday, etc.). Use 1–3 short sentences, enthusiastic but calm.

Do **not** mention the waitlist, email, notifications, signing up, or getting "off" a list in \
this reply — the app sends separate fixed messages after yours for that.

Do not give detailed planning advice, itineraries, vendor picks, or budgets — stay high-level.
Never ask them to sign up again — they're already waitlisted.

Also classify what they're most interested in (one label only):
- birthday_party — kids or adult birthday celebrations
- holiday_or_family — holidays, reunions, family gatherings, entertaining at home
- travel — trips, vacations, itineraries, destinations
- other — anything else or unclear
"""


class InterestSurveyTurn(BaseModel):
    reply: str = Field(
        description=(
            "Warm acknowledgment only (1–3 short sentences). No waitlist or email wording."
        )
    )
    interest_category: str = Field(
        description=(
            "Exactly one of: birthday_party, holiday_or_family, travel, other"
        ),
    )


class WaitlistSurveyAgent(BaseAgent[InterestSurveyTurn]):
    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    @property
    def output_model(self) -> type[InterestSurveyTurn]:
        return InterestSurveyTurn

    @property
    def temperature(self) -> float:
        return 0.75

    async def run(self, user_messages: list[dict[str, str]]) -> InterestSurveyTurn:
        turn = await super().run(user_messages)
        cat = turn.interest_category.strip().lower().replace("-", "_")
        if cat not in VALID_CATEGORIES:
            cat = "other"
        return InterestSurveyTurn(reply=turn.reply.strip(), interest_category=cat)
