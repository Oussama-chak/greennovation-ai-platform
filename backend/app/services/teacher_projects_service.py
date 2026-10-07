from __future__ import annotations

import json
import os
from pathlib import Path

from backend.app.schemas.project import Project, ProjectsPayload
from backend.app.services.catalog_seed import SEED_TEACHER_PROJECTS

_TEACHER_PROJECTS_FILE = "teacher_projects.json"


def _path() -> Path:
    return Path(os.environ["GREENNOVATION_DATA_DIR"]).resolve() / _TEACHER_PROJECTS_FILE


def _ensure_seed() -> None:
    p = _path()
    if p.is_file():
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = ProjectsPayload(projects=[Project.model_validate(row) for row in SEED_TEACHER_PROJECTS])
    p.write_text(payload.model_dump_json(indent=2), encoding="utf-8")


def load_teacher_projects() -> list[Project]:
    _ensure_seed()
    p = _path()
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        payload = ProjectsPayload.model_validate(raw)
        return payload.projects
    except (OSError, json.JSONDecodeError, Exception):
        return [Project.model_validate(row) for row in SEED_TEACHER_PROJECTS]


def save_teacher_projects(projects: list[Project]) -> list[Project]:
    # Teacher templates always mark assignedByTeacher for class merge on the student side.
    cleaned: list[Project] = []
    for project in projects:
        data = project.model_dump()
        data["assignedByTeacher"] = True
        cleaned.append(Project.model_validate(data))
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = ProjectsPayload(projects=cleaned)
    p.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return cleaned
