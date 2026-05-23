from __future__ import annotations

from typing import Any

from ai.agents.student_modeling.schemas import StudentTwinSnapshot


def merge_pipeline_into_twin(
    current: StudentTwinSnapshot,
    state: dict[str, Any],
) -> StudentTwinSnapshot:
    raw_state_twin = state.get("student_twin")
    if isinstance(raw_state_twin, dict) and raw_state_twin:
        try:
            # Prefer the profile/student-modeling LLM result when it ran this turn.
            twin = StudentTwinSnapshot.model_validate(raw_state_twin)
        except Exception:
            twin = current.model_copy(deep=True)
    else:
        twin = current.model_copy(deep=True)

    profile_vector = state.get("profile_vector") or {}
    readiness_signal = state.get("readiness_signal") or {}
    planner_state = state.get("planner_state") or {}

    if isinstance(profile_vector, dict) and profile_vector:
        twin.last_profile_vector = profile_vector

        if (v := profile_vector.get("preferred_format")) is not None:
            twin.learning_preferences["preferred_format"] = v
        if (v := profile_vector.get("pace")) is not None:
            twin.learning_preferences["pace"] = v
        if (v := profile_vector.get("preferred_explanation_style")) is not None:
            twin.learning_preferences["explanation_style"] = v

    if isinstance(readiness_signal, dict) and readiness_signal:
        twin.last_readiness_signal = readiness_signal

        if (v := readiness_signal.get("workload_pressure_band")) is not None:
            twin.cognitive_state.stress_level = str(v)
        if (v := readiness_signal.get("study_stability_band")) is not None:
            twin.cognitive_state.learning_stability = str(v)
        if (v := readiness_signal.get("behavioral_fatigue_band")) is not None:
            twin.cognitive_state.overload_risk = str(v)
        if (v := readiness_signal.get("performance_trend_band")) is not None:
            twin.cognitive_state.mastery_trend = str(v)

        if (v := readiness_signal.get("difficulty_adjustment")) is not None:
            twin.adaptation_strategy.difficulty = str(v)
        if (v := readiness_signal.get("support_tone")) is not None:
            twin.adaptation_strategy.tone = str(v)
        if (v := readiness_signal.get("suggested_session_minutes")) is not None:
            twin.adaptation_strategy.session_minutes = int(v)

    if isinstance(planner_state, dict) and planner_state:
        twin.last_planner_state = planner_state

    query = state.get("query")
    if isinstance(query, str) and query.strip():
        line = f"Turn: {query.strip()[:200]}"
        twin.evidence = [line, *[e for e in twin.evidence if e != line][:7]]

    twin.turn_count = (twin.turn_count or 0) + 1
    return twin