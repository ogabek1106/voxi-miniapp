import base64
import hashlib
import hmac
import json
import os
import re
import time
from datetime import datetime

from fastapi import HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.models import ReadingProgress, ReadingTest, User
from app.services.password_service import hash_password, verify_password

SESSION_COOKIE = "ebai_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _session_secret() -> bytes:
    secret = os.getenv("WEBSITE_SESSION_SECRET") or os.getenv("SECRET_KEY") or os.getenv("VCOIN_BACKEND_TOKEN")
    if not secret:
        secret = "dev-session-secret-change-me"
    return secret.encode("utf-8")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def create_session_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_MAX_AGE,
    }
    payload_raw = _b64(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_session_secret(), payload_raw.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_raw}.{_b64(signature)}"


def read_session_token(token: str | None) -> int | None:
    if not token or "." not in token:
        return None
    payload_raw, signature_raw = token.split(".", 1)
    expected = _b64(hmac.new(_session_secret(), payload_raw.encode("ascii"), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, signature_raw):
        return None
    try:
        payload = json.loads(_unb64(payload_raw).decode("utf-8"))
    except Exception:
        return None
    if int(payload.get("exp") or 0) < int(time.time()):
        return None
    return int(payload.get("user_id") or 0) or None


def set_session_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=create_session_token(user.id),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def get_session_user(db: Session, request: Request) -> User | None:
    user_id = read_session_token(request.cookies.get(SESSION_COOKIE))
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def require_session_user(db: Session, request: Request) -> User:
    user = get_session_user(db, request)
    if not user:
        raise HTTPException(status_code=401, detail="unauthenticated")
    return user


def validate_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if not EMAIL_RE.match(normalized):
        raise HTTPException(status_code=400, detail="invalid_email")
    return normalized


def validate_password(password: str) -> str:
    if len(password or "") < 8:
        raise HTTPException(status_code=400, detail="password_too_short")
    return password


def signup_email(db: Session, name: str, surname: str | None, email: str, password: str) -> User:
    email = validate_email(email)
    password = validate_password(password)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="email_already_exists")

    user = User(
        telegram_id=None,
        email=email,
        password_hash=hash_password(password),
        name=(name or "").strip() or None,
        surname=(surname or "").strip() or None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_email(db: Session, email: str, password: str) -> User:
    email = validate_email(email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_email_or_password")
    return user


def login_telegram(db: Session, payload: dict) -> User:
    telegram_id = int(payload.get("id"))
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            email=None,
            password_hash=None,
            name=(payload.get("first_name") or "").strip() or None,
            surname=(payload.get("last_name") or "").strip() or None,
            photo_url=(payload.get("photo_url") or "").strip() or None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        user.name = user.name or (payload.get("first_name") or "").strip() or None
        user.surname = user.surname or (payload.get("last_name") or "").strip() or None
        user.photo_url = (payload.get("photo_url") or "").strip() or user.photo_url
        user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


def get_last_activity(db: Session, user: User):
    last = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user.id,
            ReadingProgress.submitted_at != None
        )
        .order_by(ReadingProgress.submitted_at.desc())
        .first()
    )
    if not last:
        return None
    test = db.query(ReadingTest).filter(ReadingTest.id == last.test_id).first()
    score = None
    if last.raw_score is not None and last.max_score is not None:
        score = f"{last.raw_score}/{last.max_score}"
    return {
        "reading_title": test.title if test else "Reading",
        "score": score,
        "band": last.band_score
    }


def safe_user(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "email": user.email,
        "name": user.name,
        "surname": user.surname,
        "photo_url": user.photo_url,
        "v_coins": int(user.v_coins or 0),
        "is_admin": bool(user.telegram_id in ADMIN_IDS) if user.telegram_id else False,
        "last_activity": get_last_activity(db, user),
    }
