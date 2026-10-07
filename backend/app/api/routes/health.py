import os
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    data_dir = Path(os.environ["GREENNOVATION_DATA_DIR"])
    return {
        "status": "ok",
        "data_dir": str(data_dir),
        "data_dir_exists": data_dir.is_dir(),
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "groq_model": os.environ.get("GROQ_MODEL") or "openai/gpt-oss-20b",
    }
