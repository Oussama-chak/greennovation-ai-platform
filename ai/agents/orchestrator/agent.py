from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timezone
from typing import Any, Dict, List

from ai.agents.profile.node import profile_agent_node
from ai.agents.rag.agent import rag_agent
from ai.agents.readiness.agent import run_readiness_agent
from ai.agents.energy.agent import energy_agent
from ai.agents.energy.metrics import merge_metric_deltas


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _classify_intent(query: str, fallback_intent: str = "unknown") -> tuple[str, str]:
    q = (query or "").strip().lower()

    if fallback_intent and fallback_intent != "unknown":
        return fallback_intent, "Intent provided by upstream state."

    if any(k in q for k in ["exercise", "exercises", "practice", "quiz", "problems"]):
        return "practice", "Practice-oriented wording detected."
    if any(k in q for k in ["revise", "revision", "review", "summary", "summarize"]):
        return "revise", "Revision-oriented wording detected."
    if any(k in q for k in ["plan", "schedule", "roadmap", "study plan"]):
        return "plan_study", "Planning-oriented wording detected."
    if any(k in q for k in ["stress", "stressed", "overwhelmed", "anxious", "burnout"]):
        return "wellbeing_check", "Wellbeing wording detected."
    if any(
        k in q
        for k in [
            "explain",
            "what is",
            "what's",
            "whats ",
            "teach me",
            "help me understand",
            "define ",
            "describe ",
        ]
    ):
        return "learn_concept", "Concept-learning wording detected."

    return "unknown", "No strong intent detected."


def _build_base_routing(intent: str, route_reason: str) -> Dict[str, Any]:
    priority = "normal"
    if intent in {"wellbeing_check", "mixed"}:
        priority = "high"

    return {
        "intent": intent,
        "requested_agents": [],
        "route_reason": route_reason,
        "priority": priority,
        "token_budget": 0,
    }


def _build_execution_plan(intent: str, energy_decision: Dict[str, Any]) -> Dict[str, Any]:
    requested_agents = []

    if energy_decision.get("use_profile", False):
        requested_agents.append("profile")

    if energy_decision.get("use_rag", False) and intent not in {"wellbeing_check"}:
        requested_agents.append("rag")

    if energy_decision.get("use_readiness", False):
        requested_agents.append("readiness")

    token_budget = int(energy_decision.get("max_tokens", 400))

    return {
        "requested_agents": requested_agents,
        "token_budget": token_budget,
        "response_depth": energy_decision.get("response_depth", "medium"),
    }


def _run_readiness_patch(base: Dict[str, Any]) -> Dict[str, Any]:
    """Run readiness on a copy and return patch keys only (safe for parallel fan-out)."""
    s = copy.deepcopy(base)
    run_readiness_agent(s)
    patch: Dict[str, Any] = {}
    if "readiness_signal" in s:
        patch["readiness_signal"] = s["readiness_signal"]
    ra = s.get("agent_runs", {})
    if "readiness_agent" in ra:
        patch["agent_runs"] = {"readiness_agent": ra["readiness_agent"]}
    bt = base.get("traces") or []
    st = s.get("traces") or []
    if len(st) > len(bt):
        patch["traces"] = st
    if s.get("errors"):
        patch["errors"] = s.get("errors", [])
    return patch


def _merge_specialist_patches(
    working_state: Dict[str, Any],
    profile_patch: Dict[str, Any],
    rag_patch: Dict[str, Any],
    readiness_patch: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge parallel agent outputs without losing agent_runs / traces."""
    merged: Dict[str, Any] = {}
    for p in (profile_patch, rag_patch, readiness_patch):
        for k, v in p.items():
            if k in ("agent_runs", "traces"):
                continue
            merged[k] = v
    merged["agent_runs"] = {
        **working_state.get("agent_runs", {}),
        **profile_patch.get("agent_runs", {}),
        **rag_patch.get("agent_runs", {}),
        **readiness_patch.get("agent_runs", {}),
    }
    traces = list(working_state.get("traces") or [])
    for p in (profile_patch, rag_patch, readiness_patch):
        if p.get("traces"):
            t = p["traces"]
            if len(t) > len(traces):
                traces = t
    merged["traces"] = traces
    errs = list(working_state.get("errors") or [])
    for p in (profile_patch, rag_patch, readiness_patch):
        if p.get("errors"):
            for e in p["errors"]:
                if e not in errs:
                    errs.append(e)
    if errs:
        merged["errors"] = errs
    return merged


async def _run_specialists_parallel(
    working_state: Dict[str, Any], requested: List[str]
) -> Dict[str, Any]:
    """
    Fan-out: profile, RAG, readiness in parallel (each sees a deep copy of base state).
    """

    async def _profile_coro() -> Dict[str, Any]:
        if "profile" not in requested:
            return {}
        return await profile_agent_node(copy.deepcopy(working_state))

    def _rag_sync() -> Dict[str, Any]:
        if "rag" not in requested:
            return {}
        return rag_agent(copy.deepcopy(working_state))

    def _readiness_sync() -> Dict[str, Any]:
        if "readiness" not in requested:
            return {}
        return _run_readiness_patch(copy.deepcopy(working_state))

    profile_patch, rag_patch, readiness_patch = await asyncio.gather(
        _profile_coro(),
        asyncio.to_thread(_rag_sync),
        asyncio.to_thread(_readiness_sync),
    )
    return _merge_specialist_patches(working_state, profile_patch, rag_patch, readiness_patch)


def _merge_outputs(state: Dict[str, Any]) -> Dict[str, Any]:
    routing = state.get("routing", {})
    intent = routing.get("intent", "unknown")

    profile_vector = state.get("profile_vector", {})
    retrieved_chunks = state.get("retrieved_chunks", [])
    readiness_signal = state.get("readiness_signal", {}) or state.get("session_signals", {})
    student_twin = state.get("student_twin", {}) or {}
    adaptation_strategy = (
        student_twin.get("adaptation_strategy", {})
        if isinstance(student_twin, dict)
        else {}
    )
    energy_decision = state.get("energy_decision", {})

    preferred_format = profile_vector.get("preferred_format", "")
    struggle_score = float(
        readiness_signal.get("struggle_score", readiness_signal.get("stress_score", 0.0))
    )

    if intent == "practice":
        response_strategy = "exercise_first"
    elif intent == "revise":
        response_strategy = "summary_first"
    elif intent == "plan_study":
        response_strategy = "structured_plan"
    elif struggle_score >= 0.7:
        response_strategy = "scaffolded_explanation"
    elif preferred_format == "examples_first":
        response_strategy = "examples_first"
    else:
        response_strategy = "guided_explanation"

    merged_signal_bundle = {
        "intent": intent,
        "retrieved_chunks": retrieved_chunks,
        "profile_vector": profile_vector,
        "readiness_signal": readiness_signal,
        "energy_decision": energy_decision,
        "response_strategy": response_strategy,
        "adaptation_strategy": adaptation_strategy,
    }

    response_draft = {
        "answer_type": (
            "exercise" if intent == "practice"
            else "summary_with_questions" if intent == "revise"
            else "plan" if intent == "plan_study"
            else "supportive_guidance" if intent == "wellbeing_check"
            else "explanation"
        ),
        "structure": "contextual_rag" if retrieved_chunks else response_strategy,
        "tone": "adaptive",
    }

    return {
        "merged_signal_bundle": merged_signal_bundle,
        "response_draft": response_draft,
    }


async def orchestrator_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    started_at = _utc_now()

    try:
        query = state.get("query", "")
        fallback_intent = state.get("routing", {}).get("intent", "unknown")

        intent, route_reason = _classify_intent(query, fallback_intent=fallback_intent)
        routing = _build_base_routing(intent, route_reason)

        updates: Dict[str, Any] = {
            "routing": routing,
            "traces": [
                {
                    "agent": "orchestrator",
                    "message": f"intent={intent}; starting energy-first orchestration",
                }
            ],
        }

        # 1) ENERGY FIRST
        energy_patch = energy_agent({**state, **updates})
        updates.update(energy_patch)

        energy_decision = updates.get("energy_decision", state.get("energy_decision", {}))
        execution_plan = _build_execution_plan(intent, energy_decision)

        # Cache-driven fast paths decided by energy agent.
        if energy_decision.get("reuse_cached_answer") and updates.get("cached_answer") is not None:
            execution_plan["requested_agents"] = []
        elif energy_decision.get("reuse_cached_rag") and isinstance(updates.get("cached_rag_chunks"), list):
            updates["retrieved_chunks"] = updates.get("cached_rag_chunks") or []
            execution_plan["requested_agents"] = [
                a for a in execution_plan["requested_agents"] if a != "rag"
            ]

        if energy_decision.get("reuse_readiness_signal"):
            execution_plan["requested_agents"] = [
                a for a in execution_plan["requested_agents"] if a != "readiness"
            ]

        updates["routing"] = {
            **routing,
            "requested_agents": execution_plan["requested_agents"],
            "token_budget": execution_plan["token_budget"],
        }

        working_state = {**state, **updates}
        requested = execution_plan["requested_agents"]

        # 2) PARALLEL FAN-OUT: profile, RAG, readiness (after energy), then merge patches
        specialist_patch = await _run_specialists_parallel(working_state, requested)
        updates.update(specialist_patch)

        # Keep cache freshness metadata for energy decisions on next turn.
        energy_cache = dict((state.get("energy_cache") or {}))
        if "profile" in requested and specialist_patch.get("profile_vector"):
            import time
            energy_cache["profile_refreshed_at_ts"] = time.time()
        if "readiness" in requested:
            energy_cache["last_readiness_input"] = state.get("passive_behavior_signals") or {}
        if energy_cache:
            updates["energy_cache"] = energy_cache

        # 3) MERGE orchestrator bundle
        merged_patch = _merge_outputs({**state, **updates})
        updates.update(merged_patch)

        existing_runs = updates.get("agent_runs", {})
        existing_runs["orchestrator"] = {
            "status": "success",
            "started_at": started_at,
            "finished_at": _utc_now(),
        }
        updates["agent_runs"] = existing_runs

        updates.setdefault("traces", [])
        updates["traces"].append(
            {
                "agent": "orchestrator",
                "message": (
                    f"energy_mode={energy_decision.get('mode', 'unknown')}; "
                    f"requested_agents={execution_plan['requested_agents']}"
                ),
            }
        )

        invocations: Dict[str, int] = {"green_orchestrator_runs": 1}
        if "profile" in requested:
            invocations["green_profile_invocations"] = 1
        if "rag" in requested:
            invocations["green_rag_invocations"] = 1
        if "readiness" in requested:
            invocations["green_readiness_invocations"] = 1
        updates["metrics"] = merge_metric_deltas(dict(updates.get("metrics") or {}), invocations)

        gm = updates.get("metrics") or {}
        updates["traces"].append(
            {
                "agent": "green_metrics",
                "estimated_tokens_saved_total": gm.get("green_estimated_tokens_saved", 0),
                "answer_cache_hits_total": gm.get("green_answer_cache_hits", 0),
                "rag_calls_saved_total": gm.get("green_rag_calls_saved", 0),
                "profile_calls_saved_total": gm.get("green_profile_calls_saved", 0),
                "readiness_calls_saved_total": gm.get("green_readiness_calls_saved", 0),
            }
        )

        return updates

    except Exception as exc:
        return {
            "warnings": [f"orchestrator failed: {exc}"],
            "agent_runs": {
                "orchestrator": {
                    "status": "failed",
                    "started_at": started_at,
                    "finished_at": _utc_now(),
                    "error": str(exc),
                }
            },
        }