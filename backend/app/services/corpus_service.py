from __future__ import annotations

import os
from pathlib import Path

from ai.agents.rag.file_index import index_pdf, list_uploads, safe_pdf_filename

_INDEX_FILES = frozenset({"index.faiss", "index.pkl"})


def data_dir_path() -> Path:
    return Path(os.environ["GREENNOVATION_DATA_DIR"]).resolve()


def safe_data_file(filename: str) -> Path | None:
    if not filename or filename in (".", ".."):
        return None
    if "/" in filename or "\\" in filename:
        return None
    base = data_dir_path()
    path = (base / filename).resolve()
    try:
        path.relative_to(base)
    except ValueError:
        return None
    if not path.is_file():
        return None
    return path


def list_corpus_files() -> dict:
    base = data_dir_path()
    if not base.is_dir():
        return {"data_dir": str(base), "files": [], "error": "data directory does not exist"}
    out: list[dict] = []
    for p in sorted(base.iterdir()):
        if not p.is_file():
            continue
        name = p.name
        if name.startswith("."):
            continue
        kind = "rag_index" if name in _INDEX_FILES else "document"
        out.append({"name": name, "size_bytes": p.stat().st_size, "kind": kind})
    return {"data_dir": str(base), "files": out}


def list_course_uploads() -> dict:
    return {"uploads": list_uploads()}


def ingest_pdf_bytes(payload: bytes, filename: str, course_id: str, chapter_id: str) -> dict:
    safe_name = safe_pdf_filename(filename)
    if safe_name is None:
        raise ValueError("Upload a .pdf file")
    base = data_dir_path()
    base.mkdir(parents=True, exist_ok=True)
    temp = base / f".{safe_name}.uploading"
    dest = base / safe_name
    temp.write_bytes(payload)
    try:
        record = index_pdf(temp, safe_name, course_id=course_id, chapter_id=chapter_id)
    except Exception:
        temp.unlink(missing_ok=True)
        raise
    os.replace(temp, dest)
    record["size_bytes"] = dest.stat().st_size
    return record
