from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from openai import AsyncOpenAI, APIError, APITimeoutError, RateLimitError
from pydantic import BaseModel

from backend.config import get_settings
from backend.logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

RETRYABLE_ERRORS = (APITimeoutError, RateLimitError, APIError)
MAX_RETRIES = 3
BASE_DELAY = 1.0


class BaseAgent(ABC, Generic[T]):
    """Abstract agent that calls OpenAI and returns a structured Pydantic model."""

    @property
    @abstractmethod
    def system_prompt(self) -> str: ...

    @property
    @abstractmethod
    def output_model(self) -> type[T]: ...

    @property
    def model(self) -> str:
        return get_settings().openai_model

    @property
    def temperature(self) -> float:
        return 0.7

    def _get_client(self) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=get_settings().openai_api_key)

    async def run(self, messages: list[dict[str, str]]) -> T:
        full_messages = [
            {"role": "system", "content": self.system_prompt},
            *messages,
        ]

        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                client = self._get_client()
                response = await client.beta.chat.completions.parse(
                    model=self.model,
                    messages=full_messages,
                    response_format=self.output_model,
                    temperature=self.temperature,
                )

                usage = response.usage
                if usage:
                    logger.info(
                        "openai call",
                        agent=self.__class__.__name__,
                        model=self.model,
                        prompt_tokens=usage.prompt_tokens,
                        completion_tokens=usage.completion_tokens,
                        total_tokens=usage.total_tokens,
                        attempt=attempt + 1,
                    )

                parsed = response.choices[0].message.parsed
                if parsed is None:
                    refusal = response.choices[0].message.refusal
                    raise ValueError(f"Model refused to respond: {refusal}")

                return parsed

            except RETRYABLE_ERRORS as exc:
                last_error = exc
                delay = BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "openai retryable error",
                    agent=self.__class__.__name__,
                    error=str(exc),
                    attempt=attempt + 1,
                    retry_in=delay,
                )
                await asyncio.sleep(delay)

        raise RuntimeError(
            f"{self.__class__.__name__} failed after {MAX_RETRIES} attempts: {last_error}"
        )
