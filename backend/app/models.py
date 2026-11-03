"""Tabel database. Struktur sama dengan database/init.sql (container PostgreSQL).
Demi privasi, foto wajah TIDAK disimpan; yang disimpan hanya hasil prediksinya."""
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

JSON_DB = JSON().with_variant(JSONB(), "postgresql")


def sekarang() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=sekarang, nullable=False)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(10), nullable=False)          # 'upload' atau 'webcam'
    image_width: Mapped[int | None] = mapped_column(Integer)
    image_height: Mapped[int | None] = mapped_column(Integer)
    n_faces: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=sekarang, nullable=False)

    user: Mapped[User] = relationship(back_populates="predictions")
    faces: Mapped[list["PredictionFace"]] = relationship(
        back_populates="prediction", cascade="all, delete-orphan", order_by="PredictionFace.face_index")


class PredictionFace(Base):
    __tablename__ = "prediction_faces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prediction_id: Mapped[int] = mapped_column(ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False,
                                               index=True)
    face_index: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    box_x: Mapped[int] = mapped_column(Integer, nullable=False)
    box_y: Mapped[int] = mapped_column(Integer, nullable=False)
    box_w: Mapped[int] = mapped_column(Integer, nullable=False)
    box_h: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str | None] = mapped_column(String(10))                    # NULL = "ekspresi kurang jelas"
    top_label: Mapped[str] = mapped_column(String(10), nullable=False)      # kelas berprobabilitas tertinggi
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    probabilities: Mapped[dict] = mapped_column(JSON_DB, nullable=False)

    prediction: Mapped[Prediction] = relationship(back_populates="faces")
