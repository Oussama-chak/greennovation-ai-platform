from __future__ import annotations

from datetime import datetime, timezone

from ai.agents.profile.llm_inference import infer_profile
from ai.agents.profile.features import build_profile_features
from ai.agents.student_modeling.adapters import (
    energy_signals_from_twin,
    learning_context_from_twin,
)
from ai.state.agent_context import AgentContext


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def profile_agent_node(state: AgentContext) -> AgentContext:
    started_at = _utc_now()

    try:
        query = state.get("query", "")
        session_history = state.get("session_history", [])
        user_profile = state.get("user_profile", {})

        signals = build_profile_features(
            query=query,
            session_history=session_history,
            user_profile=user_profile,
        )

        result = await infer_profile(
            query=query,
            history=session_history[-6:],
            user_profile=user_profile,
            signals=signals,
            student_twin=state.get("student_twin") or {},
        )

        finished_at = _utc_now()

        profile_vector = result.profile_vector.model_dump()
        student_twin = result.student_twin.model_dump()

        return {
            "profile_vector": profile_vector,
            "student_twin": student_twin,
            "learning_twin_context": learning_context_from_twin(student_twin),
            "energy_twin_signals": energy_signals_from_twin(student_twin),
            "traces": state.get("traces", [])
            + [
                {
                    "agent": "profile_agent",
                    "event": "completed",
                    "confidence": profile_vector.get("confidence"),
                    "twin_updated": True,
                }
            ],
            "agent_runs": {
                **state.get("agent_runs", {}),
                "profile_agent": {
                    "status": "success",
                    "started_at": started_at,
                    "finished_at": finished_at,
                },
            },
        }
    except Exception as exc:
        finished_at = _utc_now()

        return {
            "warnings": state.get("warnings", []) + [f"profile_agent fallback used: {exc}"],
            "errors": state.get("errors", []) + [f"profile_agent_failed: {exc}"],
            "profile_vector": {
                "preferred_explanation_style": "structured",
                "preferred_format": "step_by_step",
                "preferred_examples_domain": "general",
                "pace": "medium",
                "adaptation_tags": [],
                "confidence": 0.3,
                "reasoning_summary": "Fallback profile used due to inference failure.",
                "evidence": [],
            },
            "traces": state.get("traces", [])
            + [
                {
                    "agent": "profile_agent",
                    "event": "failed",
                    "error": str(exc),
                }
            ],
            "agent_runs": {
                **state.get("agent_runs", {}),
                "profile_agent": {
                    "status": "failed",
                    "started_at": started_at,
                    "finished_at": finished_at,
                    "error": str(exc),
                },
            },
        }
