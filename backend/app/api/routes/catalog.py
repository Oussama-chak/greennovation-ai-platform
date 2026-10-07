from fastapi import APIRouter

from backend.app.schemas.catalog import CatalogPayload
from backend.app.services import catalog_service

router = APIRouter(tags=["catalog"])


@router.get("/api/catalog")
def get_catalog():
    return catalog_service.load_catalog()


@router.put("/api/catalog")
def put_catalog(body: CatalogPayload):
    return catalog_service.save_catalog(body)
