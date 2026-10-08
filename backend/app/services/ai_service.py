from __future__ import annotations

import uuid

from ai.graph.learning_workflow import run_learning_pipeline

from backend.app.schemas.chat import ChatRequest, ChatResponse, EnergySnapshot, SessionInsightsPayload
from backend.app.services import session_service as sessions

from ai.agents.student_modeling import merge_pipeline_into_twin
from backend.app.services import digital_twin_store
from ai.agents.learning.agent import _derive_behavior_settings
from ai.agents.student_modeling.adapters import (
    energy_signals_from_twin,
    learning_context_from_twin,
)


def _clip(value: object, limit: int = 180) -> str:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def agent_signals_from_state(state: dict) -> dict:
    """Flat snapshot so the chat UI can show what each agent decided this turn."""
    merged = state.get("merged_signal_bundle") or {}
    energy = state.get("energy_decision") or merged.get("energy_decision") or {}
    readiness = state.get("readiness_signal") or merged.get("readiness_signal") or {}
    routing = state.get("routing") or {}
    chunks = state.get("retrieved_chunks") or merged.get("retrieved_chunks") or []
    runs = state.get("agent_runs") or {}
    behavior = _derive_behavior_settings(energy if isinstance(energy, dict) else {}, readiness if isinstance(readiness, dict) else {})

    quiz_difficulties: list[str] = []
    final = state.get("final_response")
    if isinstance(final, list):
        for item in final:
            if isinstance(item, dict) and item.get("difficulty"):
                quiz_difficulties.append(str(item["difficulty"]))

    def run_status(name: str) -> str:
        row = runs.get(name) if isinstance(runs, dict) else None
        if isinstance(row, dict) and row.get("status"):
            return str(row["status"])
        return "not run"

    return {
        "energy": {
            "mode": energy.get("mode"),
            "depth": energy.get("response_depth"),
            "max_tokens": energy.get("max_tokens"),
            "quiz": energy.get("generate_quiz"),
            "use_rag": energy.get("use_rag"),
            "use_readiness": energy.get("use_readiness"),
            "use_profile": energy.get("use_profile"),
            "cached_answer": energy.get("reuse_cached_answer"),
            "cached_rag": energy.get("reuse_cached_rag"),
            "cached_readiness": energy.get("reuse_readiness_signal"),
            "reason": _clip(energy.get("reason")),
            "status": run_status("energy_agent"),
        },
        "readiness": {
            "difficulty": readiness.get("difficulty_adjustment"),
            "intensity": readiness.get("recommended_intensity"),
            "tone": readiness.get("support_tone"),
            "minutes": readiness.get("suggested_session_minutes"),
            "break": readiness.get("break_recommendation"),
            "fatigue": readiness.get("behavioral_fatigue_band"),
            "workload": readiness.get("workload_pressure_band"),
            "reason": _clip(readiness.get("reasoning_summary")),
            "status": run_status("readiness_agent"),
        },
        "learning": {
            "quiz_level": behavior.get("difficulty"),
            "tone": behavior.get("support_tone"),
            "minutes": behavior.get("suggested_minutes"),
            "break": behavior.get("break_needed"),
            "quiz_difficulties": quiz_difficulties,
            "status": run_status("learning_agent"),
        },
        "routing": {
            "intent": routing.get("intent"),
            "agents": routing.get("requested_agents") or [],
            "reason": _clip(routing.get("route_reason")),
        },
        "rag": {
            "chunks": len(chunks) if isinstance(chunks, list) else 0,
            "status": run_status("rag_agent"),
        },
    }
def _energy_to_snapshot(state: dict) -> EnergySnapshot | None:
    """Expose energy agent decision for the workspace sidebar."""
    ed = state.get("energy_decision") or {}
    if not isinstance(ed, dict) or not ed:
        return None
    return EnergySnapshot(
        mode=str(ed.get("mode", "unknown")),
        responseDepth=str(ed.get("response_depth", "medium")),
        maxTokens=int(ed.get("max_tokens", 400)),
        reason=str(ed.get("reason", ""))[:600],
        reuseCachedAnswer=bool(ed.get("reuse_cached_answer")),
        reuseCachedRag=bool(ed.get("reuse_cached_rag")),
        reuseReadinessSignal=bool(ed.get("reuse_readiness_signal")),
    )


def _readiness_to_session_insights(state: dict) -> SessionInsightsPayload | None:
    """Expose readiness adaptation fields for the frontend Live insights column."""
    rs = state.get("readiness_signal") or {}
    sm = rs.get("suggested_session_minutes")
    br = rs.get("break_recommendation")
    da = rs.get("difficulty_adjustment")
    kwargs: dict[str, str] = {}
    if isinstance(sm, int):
        kwargs["sessionMinutes"] = f"{sm} minutes"
    if isinstance(br, bool):
        kwargs["breakNeeded"] = "Yes" if br else "No"
    if isinstance(da, str) and da.strip():
        kwargs["difficultyAdjustment"] = da.strip().capitalize()
    if not kwargs:
        return None
    return SessionInsightsPayload(**kwargs)


def reply_to_text(final_response: object) -> tuple[str, str | list | None]:
    if isinstance(final_response, list):
        raw: str | list | None = final_response
        lines = []
        for i, item in enumerate(final_response):
            if isinstance(item, dict):
                q = item.get("question", "")
                a = item.get("answer", "")
                options = item.get("options")
                if isinstance(options, list) and options:
                    choices = "\n".join(f"- {opt}" for opt in options)
                    lines.append(f"**Q{i + 1}** {q}\n{choices}\n*Answer:* {a}")
                else:
                    lines.append(f"**Q{i + 1}** {q}\n*Answer:* {a}")
            else:
                lines.append(str(item))
        return "\n\n".join(lines), raw
    if final_response is None:
        return "", None
    return str(final_response), str(final_response)


async def chat_turn(req: ChatRequest) -> ChatResponse:
    sid = req.session_id or str(uuid.uuid4())
    base = sessions.load_session_copy(sid) or sessions.default_session_state()
    twin = digital_twin_store.load_twin()
    twin_dict = twin.model_dump()

    base["student_twin"] = twin_dict
    base["learning_twin_context"] = learning_context_from_twin(twin_dict)
    base["energy_twin_signals"] = energy_signals_from_twin(twin_dict)


    base["query"] = req.message.strip()
    if req.intent:
        base["routing"] = {"intent": req.intent}
    else:
        base["routing"] = {"intent": "unknown"}
    if req.prompt_hint:
        base["prompt_hint"] = req.prompt_hint
    else:
        base.pop("prompt_hint", None)
    base["session_action"] = "continue"
    if req.passive_behavior_signals:
        base["passive_behavior_signals"] = req.passive_behavior_signals
    if req.course_context:
        base["course_context"] = {**(base.get("course_context") or {}), **req.course_context}

    try:
        state = await run_learning_pipeline(base)
        updated_twin = merge_pipeline_into_twin(twin, state)
        digital_twin_store.save_twin(updated_twin)
        updated_twin_dict = updated_twin.model_dump()
        state["student_twin"] = updated_twin_dict
        state["learning_twin_context"] = learning_context_from_twin(updated_twin_dict)
        state["energy_twin_signals"] = energy_signals_from_twin(updated_twin_dict)
    except Exception as e:
        return ChatResponse(
            session_id=sid,
            reply=f"The AI pipeline failed: {e}",
            reply_raw=None,
            routing=None,
            errors=[str(e)],
            warnings=[],
            energy=None,
            agent_signals=None,
        )

    final = state.get("final_response")
    text, raw = reply_to_text(final)
    sessions.save_session(sid, state)

    return ChatResponse(
        session_id=sid,
        reply=text or "No response generated.",
        reply_raw=raw,
        routing=state.get("routing"),
        errors=list(state.get("errors") or []),
        warnings=list(state.get("warnings") or []),
        session_insights=_readiness_to_session_insights(state),
        energy=_energy_to_snapshot(state),
        agent_signals=agent_signals_from_state(state),
    )
