from __future__ import annotations

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent

VALID_CATEGORIES = frozenset(
    {"birthday_party", "holiday_or_family", "travel", "other"}
)


SYSTEM_PROMPT = """\
You are Bertram, a friendly planning assistant. The user is on a **waitlist** — they do \
not have full product access yet.

On every user message:
1. Acknowledge what they said warmly and specifically (trip, party, event, etc.).
2. Reinforce that you'll email them when they're off the waitlist — do not promise dates \
or booking.
3. Do not give detailed planning advice, itineraries, vendor picks, or budgets — stay high-level.
4. Keep the reply to 2–4 short sentences, enthusiastic but calm.
5. Never end by asking them to sign up again — they're already waitlisted.

Also classify what they're most interested in (one label only):
- birthday_party — kids or adult birthday celebrations
- holiday_or_family — holidays, reunions, family gatherings, entertaining at home
- travel — trips, vacations, itineraries, destinations
- other — anything else or unclear
"""


class InterestSurveyTurn(BaseModel):
    reply: str = Field(
        description="Bertram's next message to the user, 2-4 short sentences."
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
