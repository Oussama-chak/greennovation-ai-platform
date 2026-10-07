from __future__ import annotations

import json
import os
from pathlib import Path

from backend.app.schemas.catalog import CatalogPayload
from backend.app.services.catalog_seed import SEED_CATALOG

_CATALOG_FILE = "catalog.json"


def _path() -> Path:
    return Path(os.environ["GREENNOVATION_DATA_DIR"]).resolve() / _CATALOG_FILE


def _ensure_seed() -> None:
    p = _path()
    if p.is_file():
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = CatalogPayload.model_validate(SEED_CATALOG)
    p.write_text(payload.model_dump_json(indent=2), encoding="utf-8")


def load_catalog() -> CatalogPayload:
    _ensure_seed()
    p = _path()
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return CatalogPayload.model_validate(raw)
    except (OSError, json.JSONDecodeError, Exception):
        return CatalogPayload.model_validate(SEED_CATALOG)


def save_catalog(payload: CatalogPayload) -> CatalogPayload:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return payload
