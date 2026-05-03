import os
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User
from app.services.auth_service import validate_email


def get_google_client_id() -> str:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(status_code=500, detail="google_login_not_configured")
    return client_id


def verify_google_id_token(id_token: str) -> dict:
    if not id_token:
        raise HTTPException(status_code=400, detail="missing_google_token")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="google_auth_dependency_missing") from exc

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            get_google_client_id(),
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="invalid_google_token") from exc

    if not payload.get("email_verified"):
        raise HTTPException(status_code=401, detail="google_email_not_verified")

    return payload


def login_google_user(db: Session, id_token: str) -> User:
    payload = verify_google_id_token(id_token)
    google_id = str(payload.get("sub") or "").strip()
    email = validate_email(payload.get("email") or "")
    if not google_id:
        raise HTTPException(status_code=401, detail="invalid_google_token")

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            telegram_id=None,
            email=email,
            google_id=google_id,
            password_hash=None,
            name=(payload.get("given_name") or payload.get("name") or "").strip() or None,
            surname=(payload.get("family_name") or "").strip() or None,
            photo_url=(payload.get("picture") or "").strip() or None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        user.google_id = user.google_id or google_id
        user.email = user.email or email
        user.name = user.name or (payload.get("given_name") or payload.get("name") or "").strip() or None
        user.surname = user.surname or (payload.get("family_name") or "").strip() or None
        user.photo_url = (payload.get("picture") or "").strip() or user.photo_url
        user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)
    return user
