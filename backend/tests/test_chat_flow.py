from __future__ import annotations

from datetime import date, time

import pytest
from fastapi.testclient import TestClient

from backend.agents.conversation_agent import (
    ConversationAgent,
    ConversationResult,
    RequirementExtraction,
)
from backend.main import app
from backend.models.event_request import EventRequirements
from backend.routers import chat as chat_router


@pytest.mark.asyncio
async def test_conversation_agent_extracts_out_of_order_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    agent = ConversationAgent()

    async def fake_extract_update(
        _messages: list[dict[str, str]],
        _current_requirements: EventRequirements,
    ) -> RequirementExtraction:
        return RequirementExtraction(
            child_name="Anant",
            child_age=10,
            venue_preferences="Local park picnic area",
            budget_high=3000,
            theme="Football",
            food_preferences="Vegetarian Indian lunch",
            snack_preferences="Chips and samosas",
            decoration_preferences="Football balloon setup",
            entertainment_preferences="Bounce house",
        )

    monkeypatch.setattr(agent, "_extract_update", fake_extract_update)

    result = await agent.run(
        [{"role": "user", "content": "Anant is turning 10 and the budget is about 3000 with a football theme."}],
        EventRequirements(),
    )

    assert result.requirements.child_name == "Anant"
    assert result.requirements.child_age == 10
    assert result.requirements.venue_preferences == "Local park picnic area"
    assert result.requirements.budget_high == 3000
    assert result.requirements.theme == "Football"
    assert result.requirements.food_preferences == "Vegetarian Indian lunch"
    assert result.requirements.snack_preferences == "Chips and samosas"
    assert result.requirements.decoration_preferences == "Football balloon setup"
    assert result.requirements.entertainment_preferences == "Bounce house"
    assert result.ready is False
    assert result.messages == ["What date and time would you like the party to happen?"]
    assert "budget" in result.collected_fields
    assert "venue_preferences" in result.collected_fields
    assert "food_preferences" in result.collected_fields
    assert "entertainment_preferences" in result.collected_fields
    assert "schedule" in result.missing_fields


@pytest.mark.asyncio
async def test_conversation_agent_only_marks_ready_when_all_required_fields_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    agent = ConversationAgent()

    async def fake_extract_update(
        _messages: list[dict[str, str]],
        _current_requirements: EventRequirements,
    ) -> RequirementExtraction:
        return RequirementExtraction(
            child_name="Anant",
            child_age=10,
            event_date=date(2026, 6, 15),
            event_time=time(11, 0),
            guest_count=30,
            zip_code="94539",
            venue_preferences="Football picnic at a reserved park pavilion",
            budget_low=2500,
            budget_high=3000,
            theme="Football",
            food_preferences="Vegetarian Indian lunch buffet",
            snack_preferences="Samosas, chips, and fruit cups",
            decoration_preferences="Football themed balloons and table decor",
            entertainment_preferences="Bounce house and football games",
            dietary_restrictions=["none"],
            notes="none",
        )

    monkeypatch.setattr(agent, "_extract_update", fake_extract_update)

    result = await agent.run(
        [{"role": "user", "content": "Here are all my party details."}],
        EventRequirements(),
    )

    assert result.ready is True
    assert result.missing_fields == []
    assert result.messages == ["Thanks! I have everything I need to start planning."]


@pytest.mark.asyncio
async def test_conversation_agent_keeps_waitlist_blocked_until_planning_categories_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    agent = ConversationAgent()

    async def fake_extract_update(
        _messages: list[dict[str, str]],
        _current_requirements: EventRequirements,
    ) -> RequirementExtraction:
        return RequirementExtraction(
            child_name="Anant",
            child_age=10,
            event_date=date(2026, 6, 15),
            event_time=time(11, 0),
            guest_count=30,
            zip_code="94539",
            budget_low=2500,
            budget_high=3000,
            theme="Football",
            dietary_restrictions=["none"],
            notes="none",
        )

    monkeypatch.setattr(agent, "_extract_update", fake_extract_update)

    result = await agent.run(
        [{"role": "user", "content": "I gave the basic details but not the planning preferences yet."}],
        EventRequirements(),
    )

    assert result.ready is False
    assert result.messages == [
        "Do you already have a venue in mind, or should I plan for something like a park, indoor play place, backyard, or banquet space?"
    ]
    assert "venue_preferences" in result.missing_fields
    assert "food_preferences" in result.missing_fields
    assert "decoration_preferences" in result.missing_fields
    assert "entertainment_preferences" in result.missing_fields


def test_chat_route_bootstraps_backend_owned_session() -> None:
    chat_router.session_store._sessions.clear()

    with TestClient(app) as client:
      response = client.post("/api/chat", json={})

    assert response.status_code == 200
    data = response.json()

    assert data["session_id"]
    assert data["showWaitlist"] is False
    assert data["messages"] == [
        "Hi! I can help plan your child's birthday party.",
        "What's your child's name and how old are they turning?",
    ]
    assert "child_profile" in data["progress"]["missing_fields"]
