from typing import Dict, List
from sentence_transformers import CrossEncoder
from ai.agents.rag.file_index import search_uploaded_files
from ai.agents.rag.migrate_faiss import migrate_legacy_faiss
from ai.agents.rag.opensearch_store import COURSE_INDEX, knn_search
import uuid
import os


reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


# Helpers

def clean_source(path: str) -> str:
    return os.path.basename(path) if path else "unknown"


def _normalize_source_key(raw: str) -> str:
    if not raw:
        return ""
    return os.path.basename(str(raw).replace("\\", "/"))


def _doc_matches_allowed_sources(metadata: dict, allowed: List[str]) -> bool:
    """Match corpus filename from workspace (`allowed_sources`) to index metadata."""
    raw = (metadata or {}).get("source") or ""
    if not raw:
        return False
    base = _normalize_source_key(raw)
    for src in allowed:
        s = (src or "").strip()
        if not s:
            continue
        if s in raw or s == base or base.endswith(s) or s in base:
            return True
    return False


def rerank(query: str, docs, top_k: int = 3):
    pairs = [(query, d.page_content) for d in docs]
    scores = reranker.predict(pairs)

    ranked = list(zip(docs, scores))
    ranked.sort(key=lambda x: x[1], reverse=True)

    return [doc for doc, score in ranked[:top_k]]


def truncate_content(text: str, max_chars: int) -> str:
    return text[:max_chars] if max_chars else text


def build_retrieved_chunks(docs, max_chars: int) -> List[Dict]:
    chunks = []

    for doc in docs:
        metadata = doc.metadata or {}

        content = truncate_content(doc.page_content, max_chars)

        chunk = {
            "chunk_id": str(uuid.uuid4()),
            "source_id": clean_source(metadata.get("source")),
            "document_id": metadata.get("source", "unknown"),
            "title": metadata.get("title", "unknown"),
            "content": content,
            "score": float(metadata.get("score", 0.0)),
            "metadata": {
                "page": metadata.get("page"),
                "raw_source": metadata.get("source"),
            },
        }

        chunks.append(chunk)

    return chunks



# RAG AGENT (ENERGY-AWARE)

def rag_agent(state: dict) -> dict:
    try:
        query = state.get("query", "")

        # ENERGY DECISION
        energy = state.get("energy_decision", {})

        use_rag = energy.get("use_rag", True)
        top_k = energy.get("top_k", 5)
        max_chars = energy.get("chunk_truncation_chars", 800)

        # Optional: skip reranking in light mode
        mode = energy.get("mode", "balanced")
        use_rerank = mode != "light"

        if not use_rag:
            return {
                "retrieved_chunks": [],
                "agent_runs": {
                    **state.get("agent_runs", {}),
                    "rag_agent": {
                        "status": "skipped",
                        "reason": "Energy agent disabled RAG"
                    }
                }
            }

        # QUERY
        retrieval_query = state.get("retrieval_query", {})
        query_to_use = retrieval_query.get("rewritten_query", query)

        # fallback if energy didn't specify
        top_k = retrieval_query.get("top_k", top_k)

        allowed_sources = (
            state.get("course_context", {})
            .get("allowed_sources", [])
        )
        if not isinstance(allowed_sources, list):
            allowed_sources = []

        # When the UI pins one document, the global top-k semantic hits are often
        # from *other* PDFs. Retrieve many candidates first, then filter by file.
        k_retrieve = top_k
        if allowed_sources:
            k_retrieve = min(150, max(top_k * 25, 60))

        uploaded_docs = search_uploaded_files(allowed_sources, query_to_use, k_retrieve)
        used_upload_index = uploaded_docs is not None

        if used_upload_index:
            docs = uploaded_docs
        else:
            migrate_legacy_faiss()
            docs = knn_search(COURSE_INDEX, query_to_use, k_retrieve)

            # FILTER (course-specific) — only for the shared index.
            if allowed_sources:
                docs = [
                    d for d in docs
                    if _doc_matches_allowed_sources(d.metadata or {}, allowed_sources)
                ]

        # RERANK (optional)
        
        if use_rerank and len(docs) > 1:
            docs = rerank(query_to_use, docs, top_k=min(top_k, len(docs)))

        
        # BUILD CHUNKS (truncated)
      
        retrieved_chunks = build_retrieved_chunks(docs, max_chars)

        return {
            "retrieved_chunks": retrieved_chunks,
            "agent_runs": {
                **state.get("agent_runs", {}),
                "rag_agent": {
                    "status": "success",
                    "mode": mode,
                    "top_k_used": top_k,
                    "rerank_used": use_rerank,
                    "index": "opensearch_upload" if used_upload_index else "opensearch_course",
                }
            }
        }

    except Exception as e:
        return {
            "retrieved_chunks": [],
            "errors": state.get("errors", []) + [f"rag_agent error: {str(e)}"],
            "agent_runs": {
                **state.get("agent_runs", {}),
                "rag_agent": {
                    "status": "failed",
                    "error": str(e)
                }
            }
        }