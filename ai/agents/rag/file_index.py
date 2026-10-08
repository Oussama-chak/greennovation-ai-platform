"""Per-file course uploads indexed in OpenSearch."""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path

from langchain_core.documents import Document

_LOCK = threading.Lock()
_CHUNK_SIZE = 900
_CHUNK_OVERLAP = 120
_PDF_NAME = re.compile(r"^[\w.\- ()]+\.pdf$", re.IGNORECASE)


def data_dir() -> Path:
    env = os.environ.get("GREENNOVATION_DATA_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3] / "data"


def index_root() -> Path:
    return data_dir() / "file_indexes"


def manifest_path() -> Path:
    return index_root() / "manifest.json"


def safe_pdf_filename(name: str) -> str | None:
    base = Path(name or "").name.strip()
    if not base or base.startswith(".") or len(base) > 180:
        return None
    if not _PDF_NAME.match(base):
        return None
    return base


def chunk_text(text: str, size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> list[str]:
    cleaned = text.strip()
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]
    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + size)
        piece = cleaned[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks


def extract_pages(pdf_path: Path) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    pages: list[tuple[int, str]] = []
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((index, text))
    return pages


def pages_to_documents(filename: str, pages: list[tuple[int, str]]) -> list[Document]:
    docs: list[Document] = []
    for page_number, text in pages:
        for piece in chunk_text(text):
            docs.append(
                Document(
                    page_content=piece,
                    metadata={"source": filename, "page": page_number},
                )
            )
    return docs


def _read_manifest() -> dict[str, dict]:
    path = manifest_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(k): v for k, v in data.items() if isinstance(v, dict)}


def _write_manifest(manifest: dict[str, dict]) -> None:
    root = index_root()
    root.mkdir(parents=True, exist_ok=True)
    manifest_path().write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def _slug_for(filename: str, manifest: dict[str, dict]) -> str:
    current = manifest.get(filename) or {}
    existing = current.get("slug")
    if isinstance(existing, str) and existing:
        return existing
    stem = Path(filename).stem
    base = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-").lower()[:60] or "pdf"
    used = {str(entry.get("slug")) for entry in manifest.values()}
    if base not in used:
        return base
    digest = hashlib.sha1(filename.encode("utf-8")).hexdigest()[:8]
    return f"{base}-{digest}"


def list_uploads() -> list[dict]:
    with _LOCK:
        manifest = _read_manifest()
    rows = list(manifest.values())
    rows.sort(key=lambda row: str(row.get("uploaded_at") or ""))
    return rows


def resolve_filename(name: str) -> str | None:
    with _LOCK:
        manifest = _read_manifest()
    if name in manifest:
        return name
    lowered = name.lower()
    for key in manifest:
        if key.lower() == lowered:
            return key
    return None


def index_pdf(
    pdf_path: Path,
    filename: str,
    *,
    course_id: str,
    chapter_id: str,
) -> dict:
    pages = extract_pages(pdf_path)
    documents = pages_to_documents(filename, pages)
    if not documents:
        raise ValueError("No extractable text in this PDF. Scanned pages need a text layer.")

    from ai.agents.rag.opensearch_store import UPLOADS_INDEX, delete_source, index_documents

    with _LOCK:
        manifest = _read_manifest()
        slug = _slug_for(filename, manifest)

    delete_source(UPLOADS_INDEX, filename)
    index_documents(
        UPLOADS_INDEX,
        documents,
        extra={"course_id": course_id, "chapter_id": chapter_id, "source": filename},
    )

    with _LOCK:
        manifest = _read_manifest()
        record = {
            "filename": filename,
            "slug": slug,
            "course_id": course_id,
            "chapter_id": chapter_id,
            "size_bytes": pdf_path.stat().st_size,
            "pages": len(pages),
            "chunks": len(documents),
            "uploaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        manifest[filename] = record
        _write_manifest(manifest)
    return record


def search_uploaded_files(allowed_sources: list[str], query: str, k: int) -> list | None:
    """Search indexes built from teacher uploads.

    Returns None when none of the open files have an upload index, so the
    caller can fall back to the shared course index.
    """
    if not allowed_sources or not query.strip():
        return None
    names = []
    for raw in allowed_sources:
        resolved = resolve_filename(str(raw))
        if resolved and resolved not in names:
            names.append(resolved)
    if not names:
        return None

    from ai.agents.rag.migrate_faiss import migrate_legacy_faiss
    from ai.agents.rag.opensearch_store import UPLOADS_INDEX, knn_search

    migrate_legacy_faiss()
    fetch_k = max(k, 8)
    return knn_search(UPLOADS_INDEX, query, fetch_k * len(names), sources=names)
