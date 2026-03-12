"""
Interactive CLI to test the conversation and planning agents.

Usage:
    python -m backend.agents.test_agents

Requires OPENAI_API_KEY in .env or environment.
"""

from __future__ import annotations

import asyncio
import json
import sys

from backend.agents.conversation_agent import ConversationAgent
from backend.agents.planning_agent import PlanningAgent


async def main() -> None:
    conversation = ConversationAgent()
    planner = PlanningAgent()

    messages: list[dict[str, str]] = []

    print("\n── Concierge Party Planner (test mode) ──")
    print("Type your messages below. Ctrl+C to exit.\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nBye!")
            break

        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        result = await conversation.run(messages)

        for msg in result.messages:
            print(f"Agent: {msg}")
            messages.append({"role": "assistant", "content": msg})

        if result.ready and result.requirements:
            print("\n── Requirements gathered ──")
            print(result.requirements.model_dump_json(indent=2))

            print("\n── Generating research plan... ──")
            plan_messages = [
                {
                    "role": "user",
                    "content": (
                        "Create a research plan for this event:\n"
                        + result.requirements.model_dump_json(indent=2)
                    ),
                }
            ]
            plan = await planner.run(plan_messages)

            print(f"\nPlan summary: {plan.summary}\n")
            for task in sorted(plan.tasks, key=lambda t: t.priority):
                print(f"  [{task.priority}] {task.category.value}")
                for q in task.search_queries:
                    print(f"      Search: {q}")
                print(f"      Call notes: {task.call_script_notes[:120]}...")
                print()

            print("── Done! In production, these tasks run in parallel via Celery. ──\n")
            break


if __name__ == "__main__":
    asyncio.run(main())
