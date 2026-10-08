from typing import Literal

from pydantic import BaseModel, Field

PromptHint = Literal["explain_simple", "give_example", "summarize_page"]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    session_id: str | None = Field(default=None, description="Omit to start a new session.")
    intent: str | None = Field(
        default=None,
        description="Optional: learn_concept, practice, revise, plan_study, wellbeing_check — else orchestrator infers from text.",
    )
    prompt_hint: PromptHint | None = Field(
        default=None,
        description="When the user taps a workspace suggestion chip, steer answer shape (learning prompt).",
    )
    passive_behavior_signals: dict | None = None
    course_context: dict | None = None


class SessionInsightsPayload(BaseModel):
    """Structured tutor/session signals for the Live insights sidebar (camelCase JSON)."""

    sessionMinutes: str | None = None
    breakNeeded: str | None = None
    difficultyAdjustment: str | None = None


class EnergySnapshot(BaseModel):
    """Subset of `energy_decision` for the UI (energy agent output)."""

    mode: str
    responseDepth: str
    maxTokens: int
    reason: str
    reuseCachedAnswer: bool = False
    reuseCachedRag: bool = False
    reuseReadinessSignal: bool = False


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    reply_raw: str | list | None = None
    routing: dict | None = None
    errors: list[str] = []
    warnings: list[str] = []
    session_insights: SessionInsightsPayload | None = None
    energy: EnergySnapshot | None = None
    # Compact debug view of energy, readiness, routing, and learning knobs.
    agent_signals: dict | None = None
