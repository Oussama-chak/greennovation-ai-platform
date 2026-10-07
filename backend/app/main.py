"""
FastAPI entrypoint: runs orchestrator → learning pipeline for chat turns.

Run from repo root (greenNovation):
  pip install -e ".[api]"
  uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

Env: GROQ_API_KEY (required for learning, profile, and planner).
Optional: GROQ_MODEL, GREENNOVATION_DATA_DIR.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import bootstrap

# Must run before any `ai.*` import (RAG loads FAISS at module import time).
bootstrap()

from backend.app.api.routes import (
    catalog,
    chat,
    corpus,
    forest,
    health,
    projects,
    readiness,
    session,
    teacher_projects,
)

app = FastAPI(title="greenNovation API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:8080,http://localhost:8081,http://127.0.0.1:5501,http://localhost:5501",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router)
app.include_router(chat.router)
app.include_router(corpus.router)
app.include_router(forest.router)
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(readiness.router)
app.include_router(session.router)
app.include_router(teacher_projects.router)
