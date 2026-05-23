from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CognitiveState(BaseModel):
    stress_level: str = "unknown"
    engagement: str = "unknown"
    confidence: str = "unknown"
    learning_stability: str = "unknown"
    overload_risk: str = "unknown"
    mastery_trend: str = "unknown"


class AdaptationStrategy(BaseModel):
    tone: str = "neutral"
    difficulty: str = "keep"
    explanation_depth: str = "medium"
    session_minutes: int = 30
    scaffolding: str = "normal"
    break_strategy: str = "none"


class StudentTwinSnapshot(BaseModel):
    schema_version: int = 1
    user_id: str = "default_user"
    updated_at: str | None = None

    cognitive_state: CognitiveState = Field(default_factory=CognitiveState)
    learning_preferences: dict[str, Any] = Field(default_factory=dict)
    adaptation_strategy: AdaptationStrategy = Field(default_factory=AdaptationStrategy)

    longitudinal_summary: str = ""
    evidence: list[str] = Field(default_factory=list)
    turn_count: int = 0

    last_profile_vector: dict[str, Any] = Field(default_factory=dict)
    last_readiness_signal: dict[str, Any] = Field(default_factory=dict)
    last_planner_state: dict[str, Any] = Field(default_factory=dict)


class DigitalTwinPayload(BaseModel):
    schema_version: int = 1
    user_id: str = "default_user"
    twin: StudentTwinSnapshot = Field(default_factory=StudentTwinSnapshot)