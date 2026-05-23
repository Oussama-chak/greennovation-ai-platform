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

Infer BOTH:
1. profile_vector: the short-term teaching profile for this turn.
2. student_twin: the updated long-term learner model.

For student_twin:
- If this is the first meaningful interaction, create the Twin from the current query, history, signals, and explicit profile.
- Do not leave fields as "unknown" when there is clear learning evidence.
- Update cognitive_state, learning_preferences, adaptation_strategy, longitudinal_summary, and evidence.
- Preserve useful prior Twin knowledge unless the new evidence clearly changes it.
- Keep the model focused only on learning behavior, study state, preferences, and adaptation.
- Do not infer sensitive traits.
- Be conservative, but do not copy defaults when evidence exists.
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