"""OpenSearch k-NN store for course chunks and teacher PDF uploads.

Vectors are 384-d (all-MiniLM-L6-v2), the same model the old FAISS indexes used.
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import urlparse

from langchain_core.documents import Document
from opensearchpy import OpenSearch, helpers

UPLOADS_INDEX = "greennovation-uploads"
COURSE_INDEX = "greennovation-course"
VECTOR_DIM = 384

_client: OpenSearch | None = None
_ready: set[str] = set()


def opensearch_url() -> str:
    return os.environ.get("OPENSEARCH_URL", "http://localhost:9200").rstrip("/")


def get_client() -> OpenSearch:
    global _client
    if _client is None:
        parsed = urlparse(opensearch_url())
        _client = OpenSearch(
            hosts=[{"host": parsed.hostname or "localhost", "port": parsed.port or 9200}],
            use_ssl=parsed.scheme == "https",
            verify_certs=False,
            ssl_show_warn=False,
        )
    return _client


def _mapping() -> dict[str, Any]:
    return {
        "settings": {"index": {"knn": True}},
        "mappings": {
            "properties": {
                "text": {"type": "text"},
                "vector": {
                    "type": "knn_vector",
                    "dimension": VECTOR_DIM,
                    "method": {
                        "name": "hnsw",
                        "space_type": "l2",
                        "engine": "lucene",
                    },
                },
                "source": {"type": "keyword"},
                "page": {"type": "integer"},
                "course_id": {"type": "keyword"},
                "chapter_id": {"type": "keyword"},
            }
        },
    }


def ensure_index(name: str) -> None:
    if name in _ready:
        return
    client = get_client()
    if not client.indices.exists(index=name):
        client.indices.create(index=name, body=_mapping())
    _ready.add(name)


def delete_source(index: str, source: str) -> None:
    ensure_index(index)
    get_client().delete_by_query(
        index=index,
        body={"query": {"term": {"source": source}}},
        refresh=True,
        conflicts="proceed",
    )


def index_vectors(
    index: str,
    docs: list[Document],
    vectors: list[list[float]],
    *,
    ids: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> int:
    if len(docs) != len(vectors):
        raise ValueError("docs and vectors must be the same length")
    if not docs:
        return 0
    ensure_index(index)
    extra = extra or {}
    actions = []
    for i, (doc, vector) in enumerate(zip(docs, vectors)):
        metadata = doc.metadata or {}
        source = str(metadata.get("source") or extra.get("source") or "unknown")
        page = metadata.get("page")
        body: dict[str, Any] = {
            "text": doc.page_content,
            "vector": vector,
            "source": source,
            "page": int(page) if isinstance(page, int) else page,
        }
        if extra.get("course_id"):
            body["course_id"] = extra["course_id"]
        if extra.get("chapter_id"):
            body["chapter_id"] = extra["chapter_id"]
        action: dict[str, Any] = {"_index": index, "_source": body}
        if ids is not None:
            action["_id"] = ids[i]
        actions.append(action)
    helpers.bulk(get_client(), actions, refresh=True)
    return len(actions)


def index_documents(
    index: str,
    docs: list[Document],
    *,
    extra: dict[str, Any] | None = None,
) -> int:
    if not docs:
        return 0
    from ai.agents.rag.embeddings import get_embeddings

    vectors = get_embeddings().embed_documents([doc.page_content for doc in docs])
    return index_vectors(index, docs, vectors, extra=extra)


def knn_search(
    index: str,
    query: str,
    k: int,
    *,
    sources: list[str] | None = None,
) -> list[Document]:
    ensure_index(index)
    from ai.agents.rag.embeddings import get_embeddings

    vector = get_embeddings().embed_query(query)
    knn: dict[str, Any] = {"vector": vector, "k": max(k, 1)}
    if sources:
        knn["filter"] = {"terms": {"source": sources}}
    body = {"size": max(k, 1), "query": {"knn": {"vector": knn}}}
    response = get_client().search(index=index, body=body)
    docs: list[Document] = []
    for hit in response.get("hits", {}).get("hits", []):
        source = hit.get("_source") or {}
        docs.append(
            Document(
                page_content=str(source.get("text") or ""),
                metadata={
                    "source": source.get("source") or "unknown",
                    "page": source.get("page"),
                    "score": float(hit.get("_score") or 0.0),
                    "course_id": source.get("course_id"),
                    "chapter_id": source.get("chapter_id"),
                },
            )
        )
    return docs
