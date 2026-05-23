from __future__ import annotations

from typing import Any, Dict, List

from ai.state.agent_context import MessageTurn, UserProfile


def _normalize_text(text: str) -> str:
    return (text or "").strip().lower()


def _recent_user_text(session_history: List[MessageTurn], limit: int = 6) -> str:
    messages = [
        turn.get("content", "")
        for turn in session_history[-limit:]
        if turn.get("role") == "user"
    ]
    return " ".join(messages).lower()


def _recent_user_messages(session_history: List[MessageTurn], limit: int = 6) -> List[str]:
    return [
        _normalize_text(turn.get("content", ""))
        for turn in session_history[-limit:]
        if turn.get("role") == "user" and turn.get("content")
    ]


def _detect_repeated_topic(query: str, session_history: List[MessageTurn]) -> bool:
    q = _normalize_text(query)
    if len(q) < 4:
        return False
    tokens = [t for t in q.split() if len(t) >= 4]
    if not tokens:
        return False
    prior = _recent_user_messages(session_history, limit=8)[:-1]
    hits = sum(1 for msg in prior if any(t in msg for t in tokens[:5]))
    return hits >= 1


def _detect_topic_domain(query: str, user_profile: UserProfile) -> str:
    q = _normalize_text(query)
    department = _normalize_text(user_profile.get("department", ""))

    if any(k in q for k in ["pointer", "linked list", "python", "algorithm", "database", "sql", "code", "recursion"]):
        return "computer_science"
    if any(k in q for k in ["math", "calculus", "algebra", "probability", "derivative"]):
        return "mathematics"
    if any(k in q for k in ["network", "signal", "telecom", "communication"]):
        return "engineering"

    if "software" in department or "computer" in department:
        return "computer_science"
    if "telecom" in department or "engineering" in department:
        return "engineering"

    return "general"


def build_profile_features(
    query: str,
    session_history: List[MessageTurn],
    user_profile: UserProfile,
) -> Dict[str, Any]:
    query_text = _normalize_text(query)
    history_text = _recent_user_text(session_history)
    combined = f"{query_text} {history_text}"

    asked_for_examples_count = (
        combined.count("example")
        + combined.count("examples")
        + combined.count("real world")
    )

    asked_for_simplification_count = (
        combined.count("simple")
        + combined.count("simplify")
        + combined.count("easy")
        + combined.count("step by step")
        + combined.count("one by one")
    )

    prefers_short_answers = any(
        k in combined for k in ["short", "brief", "quick", "concise"]
    )

    prefers_detailed_answers = any(
        k in combined for k in ["detailed", "deep", "more detail", "in depth"]
    )

    exam_related = any(
        k in combined for k in ["exam", "revision", "review", "quiz", "test"]
    )

    practice_related = any(
        k in combined for k in ["exercise", "practice", "problems", "quiz"]
    )

    signs_of_confusion = any(
        k in combined for k in [
            "i don't understand",
            "i dont understand",
            "confused",
            "lost",
            "hard for me",
            "i struggle",
        ]
    )

    topic_domain = _detect_topic_domain(query, user_profile)

    request_step_by_step = any(
        k in query_text for k in ["step by step", "step-by-step", "one by one", "tiny steps", "small steps"]
    )

    frustration_markers = any(
        k in combined for k in ["tired of", "again", "still dont", "still don't", "still confused", "give up"]
    )

    repeated_topic = _detect_repeated_topic(query, session_history)

    query_word_count = len(query_text.split())

    return {
        "asked_for_examples_count": asked_for_examples_count,
        "asked_for_simplification_count": asked_for_simplification_count,
        "prefers_short_answers": prefers_short_answers,
        "prefers_detailed_answers": prefers_detailed_answers,
        "exam_related": exam_related,
        "practice_related": practice_related,
        "signs_of_confusion": signs_of_confusion,
        "request_step_by_step": request_step_by_step,
        "frustration_markers": frustration_markers,
        "repeated_topic": repeated_topic,
        "query_word_count": query_word_count,
        "is_short_question": query_word_count <= 6,
        "topic_domain": topic_domain,
        "department": user_profile.get("department", ""),
        "academic_level": user_profile.get("academic_level", ""),
        "learning_style_explicit": user_profile.get("learning_style", ""),
        "pace_preference_explicit": user_profile.get("pace_preference", ""),
        "accessibility_needs": user_profile.get("accessibility_needs", []),
    }