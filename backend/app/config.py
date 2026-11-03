"""Pengaturan aplikasi dibaca dari environment variable (diisi lewat docker-compose / .env)."""
import logging
import os

log = logging.getLogger("fer.config")


def _bool(nama: str, bawaan: bool) -> bool:
    return os.getenv(nama, str(bawaan)).strip().lower() in ("1", "true", "yes", "ya")


class Settings:
    # Database, contoh: postgresql+psycopg://fer:rahasia@database:5432/fer_db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fer_lokal.db")

    # Token login (JWT)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

    # Model
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "..", "model_final"))
    VERIFY_MODEL_SHA: bool = _bool("VERIFY_MODEL_SHA", True)
    MAX_FACES: int = int(os.getenv("MAX_FACES", "10"))
    MAX_IMAGE_SIDE: int = int(os.getenv("MAX_IMAGE_SIDE", "1280"))

    # Unggahan
    MAX_UPLOAD_MB: float = float(os.getenv("MAX_UPLOAD_MB", "5"))

    # CORS (hanya perlu bila frontend tidak lewat reverse proxy Nginx)
    CORS_ORIGINS: list[str] = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]


settings = Settings()

if not settings.JWT_SECRET:
    settings.JWT_SECRET = "dev-secret-ganti-di-produksi-minimal-32-karakter"
    log.warning("JWT_SECRET tidak diisi; memakai nilai bawaan pengembangan. Isi JWT_SECRET di produksi!")
