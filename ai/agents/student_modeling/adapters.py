from __future__ import annotations

from typing import Any


def learning_context_from_twin(twin: dict[str, Any] | None) -> str:
    if not twin:
        return ""

    cognitive = twin.get("cognitive_state") or {}
    strategy = twin.get("adaptation_strategy") or {}
    preferences = twin.get("learning_preferences") or {}
    evidence = twin.get("evidence") or []
    summary = (twin.get("longitudinal_summary") or "").strip()

    explanation_style = (
        preferences.get("explanation_style")
        or preferences.get("preferred_explanation_style")
        or "balanced"
    )
    preferred_format = preferences.get("preferred_format", "balanced")

    if len(summary) > 280:
        summary = summary[:280] + "…"

    lines = [
        "STUDENT STATE FOR THIS REPLY:",
        f"- Confidence: {cognitive.get('confidence', 'unknown')}",
        f"- Engagement: {cognitive.get('engagement', 'unknown')}",
        f"- Tone: {strategy.get('tone', 'neutral')}",
        f"- Difficulty: {strategy.get('difficulty', 'keep')}",
        f"- Explanation depth: {strategy.get('explanation_depth', 'medium')}",
        f"- Scaffolding: {strategy.get('scaffolding', 'normal')}",
        f"- Pace: {preferences.get('pace', 'medium')}",
        f"- Explanation style: {explanation_style}",
        f"- Preferred format: {preferred_format}",
        f"- Overload risk: {cognitive.get('overload_risk', 'unknown')}",
        f"- Learning stability: {cognitive.get('learning_stability', 'unknown')}",
    ]

    if summary:
        lines.append(f"- Learner pattern: {summary}")

    turn_evidence = [e for e in evidence if str(e).startswith("Turn:")]
    if turn_evidence:
        lines.append(f"- Latest student ask: {turn_evidence[0]}")
    elif evidence:
        lines.append(f"- Recent evidence: {evidence[0]}")

    lines.extend([
        "",
        "TEACHING RULES (follow silently; do not mention Twin or agents):",
        "- Answer the student's exact question first; mirror their request words in structure.",
        "- If confidence is low or scaffolding is heavy: one idea per step, define terms before code,",
        "  use a tiny example per step, no large code dumps.",
        "- If overload_risk is high: shorter answer, fewer sections, no extra quiz unless asked.",
        "- If format is step_by_step*: numbered micro-steps; if examples requested, lead with one concrete case.",
        "- End with one short check question or one 'try next' action unless energy mode is light.",
    ])

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
