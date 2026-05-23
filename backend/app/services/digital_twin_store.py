from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from ai.agents.student_modeling.schemas import DigitalTwinPayload, StudentTwinSnapshot

_TWIN_FILE = "digital_twin.json"


def _path() -> Path:
    return Path(os.environ["GREENNOVATION_DATA_DIR"]).resolve() / _TWIN_FILE


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_twin(user_id: str = "default_user") -> StudentTwinSnapshot:
    return StudentTwinSnapshot(user_id=user_id, updated_at=_utc_now())


def load_twin(user_id: str = "default_user") -> StudentTwinSnapshot:
    p = _path()
    if not p.is_file():
        return default_twin(user_id)

    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_twin(user_id)

    try:
        payload = DigitalTwinPayload.model_validate(raw)
    except Exception:
        return default_twin(user_id)

    if payload.user_id != user_id:
        return default_twin(user_id)

    return payload.twin


def save_twin(twin: StudentTwinSnapshot) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)

    twin.updated_at = _utc_now()

    payload = DigitalTwinPayload(
        schema_version=1,
        user_id=twin.user_id,
        twin=twin,
    )

    p.write_text(payload.model_dump_json(indent=2), encoding="utf-8")