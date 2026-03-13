from __future__ import annotations

from datetime import date, time

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent
from backend.models.event_request import EventRequirements

SYSTEM_PROMPT = """\
You extract structured birthday-party requirements from a parent conversation.

You will receive:
1. The current known requirements as JSON
2. The conversation transcript so far

Your job:
- Update the structured requirements using any information the parent has provided
- Extract information even if it is given out of order
- Preserve existing known data unless the parent clearly corrects it
- If a field is unknown, leave it as null
- Keep answers normalized and concise
- Capture not just logistics but also planning preferences for venue, food, snacks, decorations, and entertainment

Normalization rules:
- child_name: child's first name if clear
- child_age: integer age only
- event_date: ISO date if a date is clear
- event_time: ISO time if a start time is clear
- duration_hours: set when duration is explicitly stated or strongly implied
- guest_count: total guests including adults and kids
- zip_code: zip code or short neighborhood/location string if provided
- venue_preferences: preferred venue type, setting, or constraints
- budget_low / budget_high: numeric budget bounds when mentioned
- theme: short theme/interests summary
- food_preferences: cuisine, catering, or meal style preferences
- snack_preferences: snack/appetizer preferences if mentioned
- decoration_preferences: decoration style, scale, or must-haves
- entertainment_preferences: entertainment requests like bounce house, pinata, magician, crafts, etc.
- dietary_restrictions: list values; if user says none, return ["none"]
- notes: special requests or constraints; if user says none, return "none"

Return only the structured fields. Do not generate conversational text.
"""

INITIAL_MESSAGES = [
    "Hi! I can help plan your child's birthday party.",
]


class RequirementExtraction(BaseModel):
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
        description="Reply messages to send back to the user (usually just one)"
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


class ConversationAgent(BaseAgent[RequirementExtraction]):
    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    @property
    def output_model(self) -> type[RequirementExtraction]:
        return RequirementExtraction

    @property
    def temperature(self) -> float:
        return 0.2

    async def run(
        self,
        messages: list[dict[str, str]],
        current_requirements: EventRequirements | None = None,
    ) -> ConversationResult:
        requirements = current_requirements or EventRequirements()
        update = await self._extract_update(messages, requirements)
        merged = self._merge_requirements(requirements, update)
        missing_fields = self._missing_fields(merged)
        collected_fields = self._collected_fields(merged)

        if missing_fields:
            return ConversationResult(
                ready=False,
                messages=[self._next_question(merged, missing_fields[0])],
                requirements=merged,
                missing_fields=missing_fields,
                collected_fields=collected_fields,
            )

        return ConversationResult(
            ready=True,
            messages=["Thanks! I have everything I need to start planning."],
            requirements=merged,
            missing_fields=[],
            collected_fields=collected_fields,
        )

    def initial_messages(self) -> list[str]:
        requirements = EventRequirements()
        missing_fields = self._missing_fields(requirements)
        opening = list(INITIAL_MESSAGES)
        if missing_fields:
            opening.append(self._next_question(requirements, missing_fields[0]))
        return opening

    async def _extract_update(
        self,
        messages: list[dict[str, str]],
        current_requirements: EventRequirements,
    ) -> RequirementExtraction:
        transcript = "\n".join(
            f"{message['role'].title()}: {message['content']}" for message in messages
        )
        extraction_request = [
            {
                "role": "user",
                "content": (
                    "Current known requirements:\n"
                    f"{current_requirements.model_dump_json(indent=2)}\n\n"
                    "Conversation transcript:\n"
                    f"{transcript}\n\n"
                    "Return the updated structured requirements only."
                ),
            }
        ]
        return await super().run(extraction_request)

    def _merge_requirements(
        self,
        current: EventRequirements,
        update: RequirementExtraction,
    ) -> EventRequirements:
        merged = current.model_copy(deep=True)

        if update.child_name:
            merged.child_name = update.child_name.strip()
        if update.child_age is not None:
            merged.child_age = update.child_age
        if update.event_date is not None:
            merged.event_date = update.event_date
        if update.event_time is not None:
            merged.event_time = update.event_time
        if update.duration_hours is not None:
            merged.duration_hours = update.duration_hours
        if update.guest_count is not None:
            merged.guest_count = update.guest_count
        if update.zip_code:
            merged.zip_code = update.zip_code.strip()
        if update.venue_preferences:
            merged.venue_preferences = update.venue_preferences.strip()
        if update.budget_low is not None:
            merged.budget_low = update.budget_low
        if update.budget_high is not None:
            merged.budget_high = update.budget_high
        if update.theme:
            merged.theme = update.theme.strip()
        if update.food_preferences:
            merged.food_preferences = update.food_preferences.strip()
        if update.snack_preferences:
            merged.snack_preferences = update.snack_preferences.strip()
        if update.decoration_preferences:
            merged.decoration_preferences = update.decoration_preferences.strip()
        if update.entertainment_preferences:
            merged.entertainment_preferences = update.entertainment_preferences.strip()
        if update.dietary_restrictions is not None:
            normalized = [item.strip() for item in update.dietary_restrictions if item.strip()]
            if normalized:
                merged.dietary_restrictions = normalized
        if update.notes:
            merged.notes = update.notes.strip()

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

        if not requirements.child_name.strip() or requirements.child_age is None:
            missing.append("child_profile")
        if requirements.event_date is None or requirements.event_time is None:
            missing.append("schedule")
        if requirements.guest_count is None:
            missing.append("guest_count")
        if not requirements.zip_code.strip():
            missing.append("location")
        if not requirements.venue_preferences.strip():
            missing.append("venue_preferences")
        if requirements.budget_low is None and requirements.budget_high is None:
            missing.append("budget")
        if not requirements.theme.strip():
            missing.append("theme")
        if not requirements.food_preferences.strip():
            missing.append("food_preferences")
        if not requirements.snack_preferences.strip():
            missing.append("snack_preferences")
        if not requirements.decoration_preferences.strip():
            missing.append("decoration_preferences")
        if not requirements.entertainment_preferences.strip():
            missing.append("entertainment_preferences")
        if not requirements.dietary_restrictions:
            missing.append("dietary_restrictions")
        if not requirements.notes.strip():
            missing.append("special_requests")

        return missing

    def _next_question(
        self,
        requirements: EventRequirements,
        missing_field: str,
    ) -> str:
        if missing_field == "child_profile":
            if requirements.child_age is not None and not requirements.child_name.strip():
                return "What's your child's name?"
            if requirements.child_name.strip() and requirements.child_age is None:
                return f"How old is {requirements.child_name} turning?"
            return "What's your child's name and how old are they turning?"

        if missing_field == "schedule":
            if requirements.event_date is not None and requirements.event_time is None:
                return "What time would you like the party to start?"
            if requirements.event_date is None and requirements.event_time is not None:
                return "What date would you like the party to happen?"
            return "What date and time would you like the party to happen?"

        if missing_field == "guest_count":
            return "About how many total guests are you expecting, including kids and adults?"

        if missing_field == "location":
            return "What zip code or neighborhood should I plan around?"

        if missing_field == "venue_preferences":
            return "Do you already have a venue in mind, or should I plan for something like a park, indoor play place, backyard, or banquet space?"

        if missing_field == "budget":
            return "What budget range would you like to stay within?"

        if missing_field == "theme":
            return "Do you have a theme or any specific interests your child would love?"

        if missing_field == "food_preferences":
            if requirements.snack_preferences.strip():
                return "What kind of food or cuisine would you like for the party?"
            return "What kind of food or cuisine would you like, and do you want catering or something simpler?"

        if missing_field == "snack_preferences":
            if requirements.food_preferences.strip():
                return "Do you want any snacks or appetizers in addition to the main food?"
            return "Do you want snacks or appetizers too, and if so what kind?"

        if missing_field == "decoration_preferences":
            return "What kind of decorations are you imagining, like simple balloons, themed table decor, or a fuller setup?"

        if missing_field == "entertainment_preferences":
            return "Do you want any entertainment, like a bounce house, pinata, magician, games, or crafts?"

        if missing_field == "dietary_restrictions":
            return "Any dietary restrictions or allergies I should plan around? If none, just say none."

        return "Anything else I should know, like venue preferences, accessibility needs, or special requests? If not, just say none."
