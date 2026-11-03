"""Fitur 7: info model (tanpa login), serta health check untuk container."""
from fastapi import APIRouter, Request, Response, status

from ..database import database_sehat

router = APIRouter(prefix="/api", tags=["Info & kesehatan"])


@router.get("/model-info")
def model_info(request: Request):
    return request.app.state.pengenal.ringkasan()


@router.get("/health")
def health(request: Request, response: Response):
    db_ok = database_sehat()
    model_ok = getattr(request.app.state, "pengenal", None) is not None
    if not (db_ok and model_ok):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if db_ok and model_ok else "degraded", "database": db_ok, "model": model_ok,
            "versi_aplikasi": request.app.version}
