from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter

from backend.agents.conversation_agent import ConversationAgent
from backend.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

_agent = ConversationAgent()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


class ChatResponse(BaseModel):
    messages: list[str]
    showWaitlist: bool


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]

    result = await _agent.run(messages)

    logger.info(
        "conversation turn",
        ready=result.ready,
        reply_count=len(result.messages),
    )

    return ChatResponse(
        messages=result.messages,
        showWaitlist=result.ready,
    )
