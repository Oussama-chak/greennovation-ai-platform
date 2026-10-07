import asyncio
import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.app.services.corpus_service import (
    ingest_pdf_bytes,
    list_corpus_files,
    list_course_uploads,
    safe_data_file,
)

router = APIRouter(tags=["corpus"])

_MAX_PDF_BYTES = 25 * 1024 * 1024


@router.get("/api/corpus/files")
def corpus_files():
    return list_corpus_files()


@router.get("/api/corpus/uploads")
def corpus_uploads():
    return list_course_uploads()


@router.post("/api/corpus/upload")
async def corpus_upload(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    chapter_id: str = Form(...),
):
    course = course_id.strip()
    chapter = chapter_id.strip()
    if not course or not chapter or "/" in course or "\\" in course or "/" in chapter or "\\" in chapter:
        raise HTTPException(status_code=400, detail="Course and chapter are required")
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(payload) > _MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF must be 25 MB or smaller")
    if not payload.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Upload a .pdf file")
    try:
        return await asyncio.to_thread(
            ingest_pdf_bytes,
            payload,
            file.filename or "",
            course,
            chapter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/corpus/file/{filename}")
def corpus_file(filename: str):
    path = safe_data_file(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")
    media = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, filename=path.name, media_type=media)
