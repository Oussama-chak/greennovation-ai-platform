from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from ai.llm import chat_model, groq_model
from ai.agents.profile.prompt import PROFILE_SYSTEM_PROMPT
from ai.agents.profile.schema import ProfileAndTwinInference

load_dotenv()

def _serialize_history(history: List[Dict[str, Any]]) -> str:
    return json.dumps(history, ensure_ascii=False, indent=2)


def _serialize_dict(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def get_profile_llm(model: str | None = None):
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY is not set")
    return chat_model(temperature=0.2, model=model or groq_model())


def _parse_profile_json(raw: str) -> ProfileAndTwinInference:
    text = raw.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").strip()
        if text.endswith("```"):
            text = text[: -3].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return ProfileAndTwinInference.model_validate(json.loads(text))


async def infer_profile(
    *,
    query: str,
    history: List[Dict[str, Any]],
    user_profile: Dict[str, Any],
    signals: Dict[str, Any],
    student_twin: Dict[str, Any] | None = None,
    model: str | None = None,
) -> ProfileAndTwinInference:
    """Infer the student teaching profile and digital twin using Groq JSON output."""

    user_message = f"""
Current user query:
{query}

Recent session history:
{_serialize_history(history)}

Explicit user profile:
{_serialize_dict(user_profile)}

Extracted behavioral signals:
{_serialize_dict(signals)}

Current student digital twin:
{_serialize_dict(student_twin or {})}

Follow this process internally, then output JSON only:

STEP 1 — QUERY LINGUISTICS (current query + history + signals):
- Confusion: "don't understand", "confused", "lost", "stuck", signs_of_confusion
- Request shape: "step by step", "with examples", "explain simply", "tiny steps"
- Topic: CS/math keywords in query; use topic_domain from signals when present
- Frustration/repeat: "tired of", "again", "still", repeated_topic in signals
- Pace: prefers_short_answers vs prefers_detailed_answers vs request_step_by_step

STEP 2 — profile_vector (this turn):
- Map STEP 1 to preferred_explanation_style, preferred_format, pace, adaptation_tags
- confidence: 0.9+ only with multiple consistent signals; 0.5–0.75 if query-only

STEP 3 — student_twin (longitudinal):
- Merge STEP 1–2 with the existing twin; rewrite longitudinal_summary in 2–4 sentences
- Set cognitive_state from confusion, engagement (follow-up questions), stability
- Set adaptation_strategy.scaffolding and explanation_depth to match confusion level
- evidence: add one entry quoting the student's exact words from this query
- If first meaningful interaction, initialize twin from query + signals; else evolve prior state
- Do not infer sensitive traits; do not use "unknown" when STEP 1 gives clear evidence

Return one JSON object with profile_vector and student_twin. No markdown.
""".strip()

    # Groq Structured Outputs (json_schema). strict stays false: twin maps are free-form.
    llm = get_profile_llm(model).bind(
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ProfileAndTwinInference",
                "strict": False,
                "schema": ProfileAndTwinInference.model_json_schema(),
            },
        }
    )
    response = await llm.ainvoke(
        [
            SystemMessage(content=PROFILE_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ]
    )
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    return _parse_profile_json(str(content))
