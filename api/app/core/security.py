from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
UTC = timezone.utc


def hash_password(password: str) -> str:
    settings = get_settings()
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: int, role: str, extra_claims: Optional[dict[str, Any]] = None) -> str:
    settings = get_settings()
    to_encode = {"sub": str(subject), "role": role}
    if extra_claims:
        to_encode.update(extra_claims)
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_minutes)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: int, role: str) -> str:
    settings = get_settings()
    payload = {"sub": str(subject), "role": role}
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_days)
    payload["exp"] = expire
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=[get_settings().jwt_algorithm])
    except JWTError:
        raise ValueError("Invalid or expired token")
