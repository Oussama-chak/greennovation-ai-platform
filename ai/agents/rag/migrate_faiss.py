"""One-time copy of the existing FAISS indexes into OpenSearch.

Runtime search does not read FAISS. This runs once when the OpenSearch
indexes are still empty and `data/index.faiss` or per-file indexes exist.
"""

from __future__ import annotations

import pickle
from pathlib import Path

from langchain_core.documents import Document

from ai.agents.rag.opensearch_store import COURSE_INDEX, UPLOADS_INDEX, get_client, index_vectors

_done = False


def _load_pair(folder: Path) -> tuple[list[Document], list[list[float]]] | None:
    faiss_path = folder / "index.faiss"
    pkl_path = folder / "index.pkl"
    if not faiss_path.is_file() or not pkl_path.is_file():
        return None
    import faiss

    index = faiss.read_index(str(faiss_path))
    with pkl_path.open("rb") as handle:
        docstore, index_to_docstore_id = pickle.load(handle)
    total = int(index.ntotal)
    if total <= 0:
        return [], []
    matrix = index.reconstruct_n(0, total)
    docs: list[Document] = []
    vectors: list[list[float]] = []
    for row in range(total):
        doc_id = index_to_docstore_id[row]
        doc = docstore.search(doc_id)
        if not isinstance(doc, Document):
            continue
        docs.append(doc)
        vectors.append([float(value) for value in matrix[row]])
    return docs, vectors


def _doc_count(index: str) -> int:
    client = get_client()
    if not client.indices.exists(index=index):
        return 0
    return int(client.count(index=index).get("count") or 0)


def migrate_legacy_faiss() -> dict[str, int]:
    """Copy shared and per-file FAISS vectors. Safe to call more than once."""
    global _done
    if _done:
        return {"course": 0, "uploads": 0, "skipped": 1}

    from ai.agents.rag.file_index import data_dir, index_root

    course_count = _doc_count(COURSE_INDEX)
    upload_count = _doc_count(UPLOADS_INDEX)
    if course_count > 0 and upload_count > 0:
        _done = True
        return {"course": 0, "uploads": 0, "skipped": 1}

    copied = {"course": 0, "uploads": 0}
    shared = _load_pair(data_dir())
    if course_count == 0 and shared and shared[0]:
        docs, vectors = shared
        ids = [f"course-{i}" for i in range(len(docs))]
        copied["course"] = index_vectors(COURSE_INDEX, docs, vectors, ids=ids)

    root = index_root()
    if upload_count == 0 and root.is_dir():
        for folder in root.iterdir():
            if not folder.is_dir():
                continue
            loaded = _load_pair(folder)
            if not loaded or not loaded[0]:
                continue
            docs, vectors = loaded
            ids = [f"upload-{folder.name}-{i}" for i in range(len(docs))]
            copied["uploads"] += index_vectors(UPLOADS_INDEX, docs, vectors, ids=ids)

    _done = True
    return copied
