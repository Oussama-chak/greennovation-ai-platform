"""Tests for learning agent: prompt behavior, parsing, and node with mocked LLM."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from ai.agents.learning import agent as learning_mod
from ai.agents.learning.agent import (
    _derive_behavior_settings,
    build_prompt,
    format_sources,
    learning_agent,
    parse_output,
)


def _minimal_chunks():
    return [
        {
            "chunk_id": "c1",
            "source_id": "doc1",
            "metadata": {"page": 1},
            "content": "Newton's first law states inertia.",
        }
    ]


def _base_state(**overrides):
    state = {
        "query": "What is inertia?",
        "routing": {"intent": "learn_concept"},
        "retrieved_chunks": _minimal_chunks(),
        "session_history": [],
        "conversation_summary": "",
    }
    state.update(overrides)
    return state


# --- _derive_behavior_settings ---


def test_derive_behavior_supportive_tone():
    state = _base_state(
        readiness_signal={"support_tone": "supportive"},
    )
    b = _derive_behavior_settings(state)
    assert b["support_tone"] == "supportive"
    assert "empathetic" in b["style_hint"]


def test_derive_behavior_challenging_tone():
    state = _base_state(
        readiness_signal={"support_tone": "challenging"},
    )
    b = _derive_behavior_settings(state)
    assert b["support_tone"] == "challenging"
    assert "direct coaching" in b["style_hint"]


def test_derive_behavior_difficulty_decrease_overrides_energy():
    state = _base_state(
        energy_decision={"mode": "deep"},
        readiness_signal={"difficulty_adjustment": "decrease"},
    )
    b = _derive_behavior_settings(state)
    assert b["difficulty"] == "easy"


def test_derive_behavior_break_flag():
    state = _base_state(
        readiness_signal={"break_recommendation": True, "suggested_session_minutes": 45},
    )
    b = _derive_behavior_settings(state)
    assert b["break_needed"] is True
    assert b["suggested_minutes"] == 45


# --- build_prompt (readiness / energy in prompt text) ---


def test_build_prompt_includes_supportive_style():
    state = _base_state(
        readiness_signal={"support_tone": "supportive", "suggested_session_minutes": 20},
    )
    prompt = build_prompt(state)
    assert "empathetic" in prompt
    assert "20-minute" in prompt or "20" in prompt


def test_build_prompt_includes_break_instruction_when_break_recommended():
    state = _base_state(
        readiness_signal={"break_recommendation": True},
    )
    prompt = build_prompt(state)
    assert "break reminder" in prompt.lower()


def test_build_prompt_practice_uses_easy_difficulty_when_readiness_decrease():
    state = _base_state(
        routing={"intent": "practice"},
        readiness_signal={"difficulty_adjustment": "decrease"},
    )
    prompt = build_prompt(state)
    assert '"difficulty": "easy"' in prompt


# --- parse_output ---


def test_parse_output_practice_valid_json():
    payload = [{"question": "Q?", "answer": "A", "difficulty": "easy"}]
    out = parse_output(json.dumps(payload), "practice")
    assert out["answer_type"] == "exercise"
    assert out["content"] == payload


def test_parse_output_practice_invalid_json_falls_back_to_raw():
    raw = "not json"
    out = parse_output(raw, "practice")
    assert out["answer_type"] == "exercise"
    assert out["content"] == raw


def test_parse_output_learn_concept():
    out = parse_output("Some explanation.", "learn_concept")
    assert out["answer_type"] == "explanation"


# --- format_sources ---


def test_format_sources_one_entry_per_chunk():
    """Each chunk gets a labeled line; same source_id on two chunks still yields two lines."""
    chunks = [
        {"source_id": "a", "metadata": {"page": 1}},
        {"source_id": "a", "metadata": {"page": 1}},
    ]
    src = format_sources(chunks)
    assert len(src) == 2
    assert "[1]" in src[0] and "[2]" in src[1]


# --- learning_agent (mocked LLM) ---


def test_learning_agent_no_chunks_returns_no_context():
    state = _base_state(retrieved_chunks=[])
    out = learning_agent(state)
    assert out["final_response"] == "I couldn't find this in your course material."
    assert out["agent_runs"]["learning_agent"]["status"] == "no_context"


@patch.object(learning_mod, "update_conversation_summary", return_value="summary after turn")
@patch.object(learning_mod, "get_llm")
def test_learning_agent_success_sets_response_draft_tone_from_readiness(
    mock_get_llm, _mock_summary
):
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="A concise explanation of inertia.")
    mock_get_llm.return_value = mock_llm

    # Two prior turns + this exchange => len(session_history)==4 triggers summary update
    state = _base_state(
        session_history=[
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
        ],
        energy_decision={"mode": "balanced"},
        readiness_signal={
            "support_tone": "supportive",
            "recommended_intensity": "light",
            "suggested_session_minutes": 25,
            "difficulty_adjustment": "keep",
            "break_recommendation": False,
        },
    )
    out = learning_agent(state)

    assert out["agent_runs"]["learning_agent"]["status"] == "success"
    assert out["response_draft"]["tone"] == "supportive"
    assert out["response_draft"]["structure"] == "contextual_rag"
    assert out["conversation_summary"] == "summary after turn"
    mock_llm.invoke.assert_called()
    call_prompt = mock_llm.invoke.call_args_list[0][0][0]
    assert "supportive" in call_prompt or "empathetic" in call_prompt


def test_build_prompt_asks_for_three_choices():
    state = _base_state(
        query="Generate exactly 3 multiple-choice questions from the current lesson.",
        response_draft={"answer_type": "exercise"},
    )
    prompt = build_prompt(state)
    assert "EXACTLY 3 options" in prompt
    assert "copied exactly" in prompt


def test_parse_output_maps_mcq_letter_to_option():
    raw = json.dumps(
        [
            {
                "question": "What is a variable?",
                "options": ["A loop", "A name for a value", "A file"],
                "answer": "B",
            }
        ]
    )
    out = parse_output(raw, "exercise")
    assert out["content"][0]["answer"] == "A name for a value"
    assert out["content"][0]["options"] == ["A loop", "A name for a value", "A file"]


@patch.object(learning_mod, "update_conversation_summary", return_value="s")
@patch.object(learning_mod, "get_llm")
def test_learning_agent_practice_parses_json_list(mock_get_llm, _mock_summary):
    mock_llm = MagicMock()
    payload = [
        {"question": "q1", "answer": "a1", "difficulty": "easy"},
        {"question": "q2", "answer": "a2", "difficulty": "easy"},
        {"question": "q3", "answer": "a3", "difficulty": "easy"},
    ]
    mock_llm.invoke.return_value = MagicMock(content=json.dumps(payload))
    mock_get_llm.return_value = mock_llm

    state = _base_state(
        routing={"intent": "practice"},
        readiness_signal={"difficulty_adjustment": "decrease"},
    )
    out = learning_agent(state)

    assert out["agent_runs"]["learning_agent"]["status"] == "success"
    assert isinstance(out["final_response"], list)
    assert len(out["final_response"]) == 3
