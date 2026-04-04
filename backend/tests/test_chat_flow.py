from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from backend.agents.conversation_agent import (
    FINAL_WAITLIST_MESSAGE,
    ConversationAgent,
    ConversationResult,
    ConversationTurn,
)
from backend.database.connection import get_session
from backend.main import app
from backend.models.event_request import EventRequirements
from backend.routers import whatsapp as whatsapp_router
from backend.services import conversation_flow
from backend.services.chat_sessions import ChatSession, ChatSessionStore, SessionMessage


@pytest.mark.asyncio
async def test_conversation_agent_appends_fixed_waitlist_message_when_ready(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    agent = ConversationAgent()

    async def fake_base_run(
        self: ConversationAgent,
        _messages: list[dict[str, str]],
    ) -> ConversationTurn:
        return ConversationTurn(
            reply="Anything else would go here",
            ready=True,
            child_name="Anant",
            child_age=10,
            event_date="2026-07-21",
            event_time="15:00:00",
            guest_count=20,
            zip_code="94025",
            budget_high=1000,
            theme="Football",
        )

    monkeypatch.setattr(
        "backend.agents.conversation_agent.BaseAgent.run",
        fake_base_run,
    )

    result = await agent.run(
        [{"role": "user", "content": "Here are all the details."}],
        EventRequirements(),
    )

    assert result.ready is True
    assert result.messages == [
        "Anything else would go here",
        FINAL_WAITLIST_MESSAGE,
    ]


@pytest.mark.asyncio
async def test_get_or_create_by_phone_returns_existing_session() -> None:
    store = ChatSessionStore()
    existing = ChatSession(session_id=str(uuid.uuid4()))
    store.get_by_phone = AsyncMock(return_value=existing)  # type: ignore[method-assign]
    store.create_for_phone = AsyncMock()  # type: ignore[method-assign]

    session = await store.get_or_create_by_phone("whatsapp:+15551234567", AsyncMock())

    assert session is existing
    store.create_for_phone.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_or_create_by_phone_creates_session_when_missing() -> None:
    store = ChatSessionStore()
    created = ChatSession(session_id=str(uuid.uuid4()))
    store.get_by_phone = AsyncMock(return_value=None)  # type: ignore[method-assign]
    store.create_for_phone = AsyncMock(return_value=created)  # type: ignore[method-assign]

    session = await store.get_or_create_by_phone("whatsapp:+15551234567", AsyncMock())

    assert session is created
    store.create_for_phone.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_persists_twilio_sids() -> None:
    store = ChatSessionStore()
    event_id = uuid.uuid4()
    event = SimpleNamespace(requirements={})

    added_rows = []

    class FakeDB:
        async def get(self, _model: object, _event_id: object) -> object:
            return event

        def add(self, row: object) -> None:
            added_rows.append(row)

    db = FakeDB()

    session = ChatSession(session_id=str(event_id))
    session.append_messages(
        [
            SessionMessage(role="user", content="Hello", sid="SM-inbound"),
            SessionMessage(role="assistant", content="Hi there!", sid="SM-outbound"),
        ]
    )

    await store.save(session, db)  # type: ignore[arg-type]

    assert event.requirements == session.requirements.model_dump(mode="json")
    assert [row.direction for row in added_rows] == ["inbound", "outbound"]
    assert [row.sid for row in added_rows] == ["SM-inbound", "SM-outbound"]


@pytest.mark.asyncio
async def test_process_incoming_message_reuses_conversation_agent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = ChatSession(session_id=str(uuid.uuid4()))
    save_mock = AsyncMock()
    monkeypatch.setattr(conversation_flow.session_store, "save", save_mock)

    expected_requirements = EventRequirements(child_name="Anant", theme="Football")
    expected_result = ConversationResult(
        ready=False,
        messages=["What date were you thinking?"],
        requirements=expected_requirements,
        missing_fields=["event_date"],
        collected_fields=["child_name", "theme"],
    )

    class FakeAgent:
        def __init__(self) -> None:
            self.calls: list[list[dict[str, str]]] = []

        async def run(
            self,
            messages: list[dict[str, str]],
            current_requirements: EventRequirements | None = None,
        ) -> ConversationResult:
            self.calls.append(messages)
            assert current_requirements == session.requirements
            return expected_result

    fake_agent = FakeAgent()
    monkeypatch.setattr(conversation_flow, "_agent", fake_agent)

    result = await conversation_flow.process_incoming_message(
        session,
        SessionMessage(role="user", content="My son Anant wants a football party."),
        AsyncMock(),
    )

    assert result == expected_result
    assert session.requirements == expected_requirements
    assert session.messages[-1].content == "My son Anant wants a football party."
    save_mock.assert_awaited_once()
    assert fake_agent.calls[0][-1]["content"] == "My son Anant wants a football party."


def test_whatsapp_webhook_ignores_duplicate_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = object()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(
        whatsapp_router.session_store,
        "has_message_sid",
        AsyncMock(return_value=True),
    )
    send_mock = AsyncMock()
    monkeypatch.setattr(whatsapp_router.twilio_whatsapp, "send_message", send_mock)

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/twilio/whatsapp",
            data={
                "From": "whatsapp:+15551234567",
                "Body": "Hello",
                "MessageSid": "SM-duplicate",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    send_mock.assert_not_awaited()


def test_whatsapp_webhook_sends_agent_reply(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = object()
    session = ChatSession(session_id=str(uuid.uuid4()))

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(
        whatsapp_router.session_store,
        "has_message_sid",
        AsyncMock(return_value=False),
    )
    monkeypatch.setattr(
        whatsapp_router.session_store,
        "get_or_create_by_phone",
        AsyncMock(return_value=session),
    )

    captured_user_messages: list[SessionMessage] = []

    async def fake_process_incoming_message(
        active_session: ChatSession,
        user_message: SessionMessage,
        _db: object,
    ) -> ConversationResult:
        assert active_session is session
        captured_user_messages.append(user_message)
        return ConversationResult(
            ready=False,
            messages=["Absolutely, let's start with the date."],
            requirements=EventRequirements(child_name="Anant"),
            missing_fields=["event_date"],
            collected_fields=["child_name"],
        )

    monkeypatch.setattr(
        whatsapp_router,
        "process_incoming_message",
        fake_process_incoming_message,
    )

    send_mock = AsyncMock(return_value="SM-outbound")
    save_mock = AsyncMock()
    monkeypatch.setattr(whatsapp_router.twilio_whatsapp, "send_message", send_mock)
    monkeypatch.setattr(whatsapp_router.session_store, "save", save_mock)

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/twilio/whatsapp",
            data={
                "From": "+15551234567",
                "Body": "I want to plan a party",
                "MessageSid": "SM-inbound",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert captured_user_messages[0].sid == "SM-inbound"
    assert captured_user_messages[0].content == "I want to plan a party"
    send_mock.assert_awaited_once_with(
        "whatsapp:+15551234567",
        "Absolutely, let's start with the date.",
    )
    assert session.messages[-1].sid == "SM-outbound"
    save_mock.assert_awaited_once()
