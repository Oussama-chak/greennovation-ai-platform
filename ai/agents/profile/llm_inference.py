from __future__ import annotations

import json
import os
from typing import Any, Dict, List
from dotenv import load_dotenv

from mistralai.client import Mistral
from ai.agents.profile.prompt import PROFILE_SYSTEM_PROMPT
from ai.agents.profile.schema import ProfileAndTwinInference
load_dotenv()

def _serialize_history(history: List[Dict[str, Any]]) -> str:
    return json.dumps(history, ensure_ascii=False, indent=2)


def _serialize_dict(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def get_mistral_client() -> Mistral:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY is not set")
    return Mistral(api_key=api_key)


async def infer_profile_with_mistral(
    *,
    query: str,
    history: List[Dict[str, Any]],
    user_profile: Dict[str, Any],
    signals: Dict[str, Any],
    student_twin: Dict[str, Any] | None = None,
    model: str = "mistral-small-latest",
) -> ProfileAndTwinInference:
    """
    Infer the student teaching profile using Mistral structured output.
    """

    client = get_mistral_client()

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

Output profile_vector and student_twin per schema.
""".strip()

    response = await client.chat.complete_async(
        model=model,
        messages=[
            {"role": "system", "content": PROFILE_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ProfileAndTwinInference",
                "schema": ProfileAndTwinInference.model_json_schema(),
            },
        },
        temperature=0.2,
        safe_prompt=False,
    )

    content = response.choices[0].message.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )

    data = json.loads(content)
    return ProfileAndTwinInference.model_validate(data)