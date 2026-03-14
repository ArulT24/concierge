from __future__ import annotations

from datetime import date, time

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent
from backend.models.event_request import EventRequirements

SYSTEM_PROMPT = """\
You are a friendly, experienced kids' birthday-party planner chatting with a parent.

Your two jobs on every turn:
1. Extract / update structured party requirements from the conversation so far.
2. Write a short, warm reply that naturally moves the conversation forward.

### Conversation style
- Sound like a real person, not a form. Vary your phrasing each time.
- Acknowledge what the parent just told you before asking the next thing.
- Ask only 1–2 questions per reply. Never interrogate.
- If the parent volunteers extra info (snacks, theme, etc.) accept it gracefully — \
don't re-ask for something they already answered.
- Keep replies concise: 1–3 sentences max.
- Use the child's name once you know it.

### What to collect (in rough priority, but be flexible)
child_name, child_age, event_date, event_time, guest_count, zip_code, \
venue_preferences, budget_low, budget_high, theme, food_preferences, \
snack_preferences, decoration_preferences, entertainment_preferences, \
dietary_restrictions, notes

You do NOT need to ask about every single field — some are optional. \
The required fields to finish intake are: child_name, child_age, event_date, \
event_time, guest_count, zip_code, budget (low or high), and theme.

When all required fields are filled, set ready=true and give a brief, \
enthusiastic wrap-up message summarizing what you know.

### Extraction rules
- Normalize values (ISO dates/times, integers for counts/ages, etc.).
- Preserve existing data unless the parent explicitly corrects it.
- If a field is unknown, leave it null.
- budget_low / budget_high: numeric dollar amounts.
- dietary_restrictions: list; if parent says "none" return ["none"].
- notes: catch-all for special requests; if parent says "none" return "none".
"""

REQUIRED_FIELDS = {
    "child_name",
    "child_age",
    "event_date",
    "event_time",
    "guest_count",
    "zip_code",
    "budget",
    "theme",
}

INITIAL_MESSAGES = [
    "Hey there! I'd love to help plan an awesome birthday party. "
    "Tell me a little about your kiddo — what's their name and how old are they turning?"
]


class ConversationTurn(BaseModel):
    """Combined LLM output: extracted requirements + natural reply."""

    reply: str = Field(
        description="The next message to send to the parent. 1-3 sentences, warm and conversational."
    )
    ready: bool = Field(
        default=False,
        description="True when all required fields are filled and intake is complete.",
    )
    child_name: str | None = None
    child_age: int | None = None
    event_date: date | None = None
    event_time: time | None = None
    duration_hours: float | None = None
    guest_count: int | None = None
    zip_code: str | None = None
    venue_preferences: str | None = None
    budget_low: float | None = None
    budget_high: float | None = None
    theme: str | None = None
    food_preferences: str | None = None
    snack_preferences: str | None = None
    decoration_preferences: str | None = None
    entertainment_preferences: str | None = None
    dietary_restrictions: list[str] | None = None
    notes: str | None = None


class ConversationResult(BaseModel):
    ready: bool = Field(
        description="True when enough information has been gathered to start planning"
    )
    messages: list[str] = Field(
        description="Reply messages to send back to the user"
    )
    requirements: EventRequirements = Field(
        description="Current best-known requirements after this turn"
    )
    missing_fields: list[str] = Field(
        default_factory=list,
        description="Fields still needed before intake is complete",
    )
    collected_fields: list[str] = Field(
        default_factory=list,
        description="Fields already collected for this intake",
    )


class ConversationAgent(BaseAgent[ConversationTurn]):
    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    @property
    def output_model(self) -> type[ConversationTurn]:
        return ConversationTurn

    @property
    def temperature(self) -> float:
        return 0.8

    async def run(
        self,
        messages: list[dict[str, str]],
        current_requirements: EventRequirements | None = None,
    ) -> ConversationResult:
        requirements = current_requirements or EventRequirements()

        transcript = "\n".join(
            f"{m['role'].title()}: {m['content']}" for m in messages
        )
        llm_messages = [
            {
                "role": "user",
                "content": (
                    "Current known requirements:\n"
                    f"{requirements.model_dump_json(indent=2)}\n\n"
                    "Conversation so far:\n"
                    f"{transcript}\n\n"
                    "Respond with the updated requirements and your next reply."
                ),
            }
        ]

        turn: ConversationTurn = await super().run(llm_messages)
        merged = self._merge_requirements(requirements, turn)
        missing = self._missing_fields(merged)
        collected = self._collected_fields(merged)

        return ConversationResult(
            ready=turn.ready and len(missing) == 0,
            messages=[turn.reply],
            requirements=merged,
            missing_fields=missing,
            collected_fields=collected,
        )

    def initial_messages(self) -> list[str]:
        return list(INITIAL_MESSAGES)

    def _merge_requirements(
        self,
        current: EventRequirements,
        turn: ConversationTurn,
    ) -> EventRequirements:
        merged = current.model_copy(deep=True)

        if turn.child_name:
            merged.child_name = turn.child_name.strip()
        if turn.child_age is not None:
            merged.child_age = turn.child_age
        if turn.event_date is not None:
            merged.event_date = turn.event_date
        if turn.event_time is not None:
            merged.event_time = turn.event_time
        if turn.duration_hours is not None:
            merged.duration_hours = turn.duration_hours
        if turn.guest_count is not None:
            merged.guest_count = turn.guest_count
        if turn.zip_code:
            merged.zip_code = turn.zip_code.strip()
        if turn.venue_preferences:
            merged.venue_preferences = turn.venue_preferences.strip()
        if turn.budget_low is not None:
            merged.budget_low = turn.budget_low
        if turn.budget_high is not None:
            merged.budget_high = turn.budget_high
        if turn.theme:
            merged.theme = turn.theme.strip()
        if turn.food_preferences:
            merged.food_preferences = turn.food_preferences.strip()
        if turn.snack_preferences:
            merged.snack_preferences = turn.snack_preferences.strip()
        if turn.decoration_preferences:
            merged.decoration_preferences = turn.decoration_preferences.strip()
        if turn.entertainment_preferences:
            merged.entertainment_preferences = turn.entertainment_preferences.strip()
        if turn.dietary_restrictions is not None:
            normalized = [item.strip() for item in turn.dietary_restrictions if item.strip()]
            if normalized:
                merged.dietary_restrictions = normalized
        if turn.notes:
            merged.notes = turn.notes.strip()

        return merged

    def _collected_fields(self, requirements: EventRequirements) -> list[str]:
        fields: list[str] = []
        if requirements.child_name.strip():
            fields.append("child_name")
        if requirements.child_age is not None:
            fields.append("child_age")
        if requirements.event_date is not None:
            fields.append("event_date")
        if requirements.event_time is not None:
            fields.append("event_time")
        if requirements.guest_count is not None:
            fields.append("guest_count")
        if requirements.zip_code.strip():
            fields.append("location")
        if requirements.venue_preferences.strip():
            fields.append("venue_preferences")
        if requirements.budget_low is not None or requirements.budget_high is not None:
            fields.append("budget")
        if requirements.theme.strip():
            fields.append("theme")
        if requirements.food_preferences.strip():
            fields.append("food_preferences")
        if requirements.snack_preferences.strip():
            fields.append("snack_preferences")
        if requirements.decoration_preferences.strip():
            fields.append("decoration_preferences")
        if requirements.entertainment_preferences.strip():
            fields.append("entertainment_preferences")
        if requirements.dietary_restrictions:
            fields.append("dietary_restrictions")
        if requirements.notes.strip():
            fields.append("special_requests")
        return fields

    def _missing_fields(self, requirements: EventRequirements) -> list[str]:
        missing: list[str] = []

        if not requirements.child_name.strip():
            missing.append("child_name")
        if requirements.child_age is None:
            missing.append("child_age")
        if requirements.event_date is None:
            missing.append("event_date")
        if requirements.event_time is None:
            missing.append("event_time")
        if requirements.guest_count is None:
            missing.append("guest_count")
        if not requirements.zip_code.strip():
            missing.append("zip_code")
        if requirements.budget_low is None and requirements.budget_high is None:
            missing.append("budget")
        if not requirements.theme.strip():
            missing.append("theme")

        return missing
