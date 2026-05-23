from __future__ import annotations

from typing import Any


def learning_context_from_twin(twin: dict[str, Any] | None) -> str:
    if not twin:
        return ""

    cognitive = twin.get("cognitive_state") or {}
    strategy = twin.get("adaptation_strategy") or {}
    preferences = twin.get("learning_preferences") or {}
    evidence = twin.get("evidence") or []

    lines = [
        "STUDENT STATE FOR THIS REPLY:",
        f"- Tone: {strategy.get('tone', 'neutral')}",
        f"- Difficulty: {strategy.get('difficulty', 'keep')}",
        f"- Explanation depth: {strategy.get('explanation_depth', 'medium')}",
        f"- Scaffolding: {strategy.get('scaffolding', 'normal')}",
        f"- Pace: {preferences.get('pace', 'medium')}",
        f"- Overload risk: {cognitive.get('overload_risk', 'unknown')}",
        f"- Learning stability: {cognitive.get('learning_stability', 'unknown')}",
    ]

    if evidence:
        lines.append(f"- Recent evidence: {evidence[0]}")

    lines.append("Use only these signals to adapt the answer. Do not mention the Twin.")

    return "\n".join(lines)


def energy_signals_from_twin(twin: dict[str, Any] | None) -> dict[str, Any]:
    if not twin:
        return {}

    cognitive = twin.get("cognitive_state") or {}
    strategy = twin.get("adaptation_strategy") or {}

    return {
        "overload_risk": cognitive.get("overload_risk"),
        "learning_stability": cognitive.get("learning_stability"),
        "session_minutes": strategy.get("session_minutes"),
    }


def planner_context_from_twin(twin: dict[str, Any] | None) -> str:
    if not twin:
        return ""

    cognitive = twin.get("cognitive_state") or {}
    strategy = twin.get("adaptation_strategy") or {}
    summary = twin.get("longitudinal_summary") or ""
    evidence = twin.get("evidence") or []

    return "\n".join(
        [
            "STUDENT STATE FOR PLANNING:",
            f"- Mastery trend: {cognitive.get('mastery_trend', 'unknown')}",
            f"- Learning stability: {cognitive.get('learning_stability', 'unknown')}",
            f"- Overload risk: {cognitive.get('overload_risk', 'unknown')}",
            f"- Preferred session minutes: {strategy.get('session_minutes', 30)}",
            f"- Summary: {summary or 'No long-term summary yet.'}",
            f"- Latest evidence: {evidence[0] if evidence else 'None'}",
        ]
    )