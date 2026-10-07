"""Shared embedding model for the course index and per-file uploads."""

from __future__ import annotations

import threading
from typing import Any

from langchain_core.embeddings import Embeddings

_model: Embeddings | None = None
_lock = threading.Lock()


class _SerializedEmbeddings(Embeddings):
    """One embed call at a time so upload indexing and chat search can share the model."""

    def __init__(self, inner: Embeddings):
        self._inner = inner

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        with _lock:
            return self._inner.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        with _lock:
            return self._inner.embed_query(text)


def get_embeddings():
    global _model
    if _model is None:
        from langchain_huggingface import HuggingFaceEmbeddings

        _model = _SerializedEmbeddings(
            HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        )
    return _model
