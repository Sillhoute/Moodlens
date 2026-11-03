"""Backend FER-2013: FastAPI + ensemble CNN (Model A + ResNet50 C2) + PostgreSQL.
Jalankan: uvicorn app.main:app --host 0.0.0.0 --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine, tunggu_database
from .ml import PengenalEkspresi
from .routers import auth, history, info, predict, stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("fer")


@asynccontextmanager
async def lifespan(app: FastAPI):
    tunggu_database()
    Base.metadata.create_all(engine)          # aman: tabel yang sudah dibuat init.sql tidak diubah
    app.state.pengenal = PengenalEkspresi(settings.MODEL_DIR, verifikasi_sha=settings.VERIFY_MODEL_SHA,
                                          max_wajah=settings.MAX_FACES, sisi_maks=settings.MAX_IMAGE_SIDE)
    log.info("Backend siap menerima request")
    yield


app = FastAPI(
    title="FER Ensemble API",
    version="1.0.0",
    description="Pengenalan ekspresi wajah (FER-2013) dengan ensemble CNN dari nol + ResNet50 C2 dan ambang keyakinan.",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

if settings.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, predict.router, history.router, stats.router, info.router):
    app.include_router(r)
