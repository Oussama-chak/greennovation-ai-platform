from __future__ import annotations

from typing import Any, Dict

from ai.agents.energy.metrics import energy_green_deltas, merge_metric_deltas




STANDARD_DECISION: Dict[str, Any] = {
    "mode":                  "balanced",
    "max_tokens":            400,
    "temperature":           0.3,
    "use_rag":               True,
    "top_k":                 5,
    "chunk_truncation_chars": 600,
    "generate_quiz":         True,
    "include_sources":       True,
    "response_depth":        "medium",
    "use_profile":           True,
    "use_readiness":         True,
    "reason":                "Standard fixed settings",
}



def _normalize_query(query: str) -> str:
    q = " ".join((query or "").strip().lower().split())
    cleaned = "".join(ch for ch in q if ch.isalnum() or ch.isspace())
    return " ".join(cleaned.split())


def _build_cache_key(state: dict, intent: str, normalized_query: str) -> str:
    course_id = (
        (state.get("course_context") or {}).get("course_id")
        or (state.get("session_snapshot") or {}).get("current_course_id")
        or "global"
    )
    return f"{course_id}:{intent}:{normalized_query}"


def _profile_ttl_expired(state: dict, ttl_seconds: int = 7 * 24 * 3600) -> bool:
    import time
    cache   = state.get("energy_cache") or {}
    last_ts = float(cache.get("profile_refreshed_at_ts", 0.0) or 0.0)
    if last_ts <= 0:
        return True
    return (time.time() - last_ts) > ttl_seconds


def _student_twin_needs_modeling(state: dict) -> bool:
    """Force profile/student-modeling when the persisted Twin is still mostly default."""
    twin = state.get("student_twin") or {}
    if not isinstance(twin, dict) or not twin:
        return True

    cognitive = twin.get("cognitive_state") or {}
    strategy = twin.get("adaptation_strategy") or {}
    preferences = twin.get("learning_preferences") or {}
    summary = (twin.get("longitudinal_summary") or "").strip()

    unknowns = {
        str(cognitive.get("engagement", "unknown")).lower(),
        str(cognitive.get("confidence", "unknown")).lower(),
        str(cognitive.get("learning_stability", "unknown")).lower(),
    }
    if unknowns == {"unknown"}:
        return True
    if not preferences:
        return True
    if not summary and not twin.get("evidence"):
        return True
    if strategy.get("scaffolding") == "normal" and not summary:
        return True

    # Re-run the LLM every 3 turns so the twin evolves with the conversation.
    turn_count = int(twin.get("turn_count") or 0)
    if turn_count > 0 and turn_count % 3 == 0:
        return True

    return False


def _readiness_changed_significantly(state: dict) -> bool:
    cache = state.get("energy_cache") or {}
    prev  = cache.get("last_readiness_input") or {}
    curr  = state.get("passive_behavior_signals") or {}
    if not prev:
        return True
    checks = [
        int(curr.get("tasks_due_3d", 0))        != int(prev.get("tasks_due_3d", 0)),
        int(curr.get("overdue_tasks", 0))        != int(prev.get("overdue_tasks", 0)),
        curr.get("project_risk_level", "low")    != prev.get("project_risk_level", "low"),
        abs(float(curr.get("avg_session_completion_rate", 0.0)) -
            float(prev.get("avg_session_completion_rate", 0.0))) >= 0.05,
        abs(float(curr.get("avg_quiz_score_trend", 0.0)) -
            float(prev.get("avg_quiz_score_trend", 0.0))) >= 2.0,
        abs(float(curr.get("late_night_activity_ratio", 0.0)) -
            float(prev.get("late_night_activity_ratio", 0.0))) >= 0.1,
        int(curr.get("long_sessions_without_breaks", 0)) !=
            int(prev.get("long_sessions_without_breaks", 0)),
    ]
    return any(checks)


# ---------------------------------------------------------------------------
# ENERGY AGENT NODE
# ---------------------------------------------------------------------------

def energy_agent(state: dict) -> dict:
    """
    Returns standard fixed LLM + RAG settings every time.
    Cache reuse logic is still applied on top so repeated identical queries
    remain cheap, but there is no mode switching based on fatigue or query length.
    """
    query            = state.get("query", "")
    intent           = (state.get("routing") or {}).get("intent", "learn_concept")
    cache            = state.get("energy_cache") or {}
    twin_energy = state.get("energy_twin_signals") or {}

    normalized_query = _normalize_query(query)
    cache_key        = _build_cache_key(state, intent, normalized_query)

    answer_cache      = cache.get("answer_cache") or {}
    rag_cache         = cache.get("rag_cache") or {}
    cached_answer     = answer_cache.get(cache_key)
    cached_rag_chunks = rag_cache.get(cache_key)
    has_answer_cache  = cached_answer is not None
    has_rag_cache     = isinstance(cached_rag_chunks, list) and len(cached_rag_chunks) > 0

    readiness_changed      = _readiness_changed_significantly(state)
    reuse_readiness_signal = (not readiness_changed) and bool(state.get("readiness_signal"))
    profile_ttl_expired    = _profile_ttl_expired(state)
    twin_needs_modeling    = _student_twin_needs_modeling(state)

    # Start from the fixed standard settings
    decision = dict(STANDARD_DECISION)

    if twin_energy.get("overload_risk") == "high":
        decision.update({
            "mode": "light",
            "max_tokens": 250,
            "response_depth": "short",
            "generate_quiz": False,
            "include_sources": False,
            "reason": "Digital Twin: high overload risk → lighter response",
        })
    decision.update({
        "reuse_cached_answer":       has_answer_cache,
        "reuse_cached_rag":          (not has_answer_cache) and has_rag_cache,
        "reuse_readiness_signal":    reuse_readiness_signal,
        "readiness_inputs_unchanged": not readiness_changed,
        "profile_ttl_ok":            (not profile_ttl_expired) and (not twin_needs_modeling),
        "twin_needs_modeling":        twin_needs_modeling,
        "cache_key":                 cache_key,
    })

    # Cache reuse can skip expensive agents for repeated queries
    if has_answer_cache:
        decision["use_rag"]       = False
        decision["use_profile"]   = False
        decision["use_readiness"] = False
        decision["reason"]        = "Exact cache hit: reused final answer, skipped specialist agents"
    else:
        if has_rag_cache:
            decision["use_rag"] = False
            decision["reason"]  = f"{decision['reason']}; reused cached retrieval chunks"
        if reuse_readiness_signal:
            decision["use_readiness"] = False
            decision["reason"]        = f"{decision['reason']}; readiness inputs unchanged"
        if not profile_ttl_expired and not twin_needs_modeling and bool(state.get("profile_vector")):
            decision["use_profile"] = False
            decision["reason"]      = f"{decision['reason']}; profile TTL still valid"

    metrics = merge_metric_deltas(
        dict(state.get("metrics") or {}),
        energy_green_deltas(
            state,
            decision,
            has_answer_cache=has_answer_cache,
            has_rag_cache=has_rag_cache,
        ),
    )

    return {
        "energy_decision":    decision,
        "cached_answer":      cached_answer,
        "cached_rag_chunks":  cached_rag_chunks if has_rag_cache else [],
        "metrics":            metrics,
        "agent_runs": {
            **state.get("agent_runs", {}),
            "energy_agent": {"status": "success"},
        },
    }