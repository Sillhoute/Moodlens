"""Bentuk data masukan/keluaran API (validasi otomatis oleh Pydantic)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$",
                          description="Huruf, angka, titik, atau garis bawah")
    password: str = Field(min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def batas_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password maksimal 72 byte")
        return v


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str | None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class Kotak(BaseModel):
    x: int
    y: int
    w: int
    h: int


class WajahOut(BaseModel):
    index: int
    box: Kotak
    label: str | None = Field(description="Ekspresi; null bila keyakinan < tau (ekspresi kurang jelas)")
    top_label: str
    confidence: float
    jelas: bool
    probabilities: dict[str, float]


class PrediksiOut(BaseModel):
    id: int | None
    source: str
    created_at: datetime | None
    image_width: int
    image_height: int
    n_faces: int
    duration_ms: float
    faces: list[WajahOut]
    message: str


class RiwayatOut(BaseModel):
    total: int
    items: list[PrediksiOut]
