"""Groq chat client. Model id can be overridden with GROQ_MODEL."""

from __future__ import annotations

import os

from langchain_groq import ChatGroq

DEFAULT_MODEL = "openai/gpt-oss-20b"


def groq_model() -> str:
    return os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def chat_model(
    *,
    temperature: float,
    max_tokens: int | None = None,
    model: str | None = None,
) -> ChatGroq:
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")
    model_id = model or groq_model()
    kwargs: dict = {
        "model": model_id,
        "temperature": temperature,
        "api_key": api_key,
    }
    # gpt-oss spends tokens on hidden reasoning; keep that short for answers.
    if "gpt-oss" in model_id:
        kwargs["reasoning_effort"] = "low"
        kwargs["reasoning_format"] = "hidden"
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    return ChatGroq(**kwargs)
