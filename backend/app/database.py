"""Koneksi database (SQLAlchemy). PostgreSQL di container, SQLite untuk uji lokal."""
import logging
import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

log = logging.getLogger("fer.db")

_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if _sqlite else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency FastAPI: satu sesi database per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def tunggu_database(percobaan: int = 30, jeda: float = 2.0) -> None:
    """Container database bisa siap lebih lambat dari backend; coba lagi beberapa kali."""
    for i in range(1, percobaan + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            log.info("Database siap (percobaan %d)", i)
            return
        except Exception as e:  # noqa: BLE001
            log.warning("Database belum siap (%d/%d): %s", i, percobaan, str(e).splitlines()[0])
            time.sleep(jeda)
    raise RuntimeError("Database tidak dapat dihubungi")


def database_sehat() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001
        return False
