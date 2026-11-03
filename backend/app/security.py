"""Hash password (bcrypt) dan token login (JWT)."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def cek_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def buat_token(user: User) -> tuple[str, int]:
    detik = settings.JWT_EXPIRE_MINUTES * 60
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=detik),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM), detik


def user_saat_ini(kred: HTTPAuthorizationCredentials | None = Depends(_bearer),
                  db: Session = Depends(get_db)) -> User:
    """Dependency: wajib login. Token dikirim di header `Authorization: Bearer <token>`."""
    gagal = HTTPException(status.HTTP_401_UNAUTHORIZED, "Silakan login terlebih dahulu",
                          headers={"WWW-Authenticate": "Bearer"})
    if kred is None or kred.scheme.lower() != "bearer":
        raise gagal
    try:
        payload = jwt.decode(kred.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesi login sudah berakhir, silakan login ulang",
                            headers={"WWW-Authenticate": "Bearer"}) from None
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise gagal from None
    user = db.get(User, user_id)
    if user is None:
        raise gagal
    return user
