import os
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User
from app.services.auth_service import validate_email


def get_google_client_id() -> str:
    client_id = (
        os.getenv("GOOGLE_CLIENT_ID")
        or os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        or os.getenv("GOOGLE_WEB_CLIENT_ID")
        or ""
    ).strip()
    if not client_id:
        raise HTTPException(status_code=500, detail="missing_google_client_id")
    return client_id


def get_google_client_secret() -> str:
    secret = (
        os.getenv("GOOGLE_CLIENT_SECRET")
        or os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
        or ""
    ).strip()
    if not secret:
        raise HTTPException(status_code=500, detail="missing_google_client_secret")
    return secret


def get_google_redirect_uri() -> str:
    redirect_uri = (
        os.getenv("GOOGLE_REDIRECT_URI")
        or os.getenv("GOOGLE_OAUTH_REDIRECT_URI")
        or ""
    ).strip()
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="missing_google_redirect_uri")
    return redirect_uri


def get_google_success_redirect_url() -> str:
    return (
        os.getenv("GOOGLE_SUCCESS_REDIRECT_URL")
        or os.getenv("WEBSITE_URL")
        or os.getenv("FRONTEND_URL")
        or "https://www.ebaiacademy.com"
    ).strip()


def build_google_auth_url() -> str:
    query = urlencode({
        "client_id": get_google_client_id(),
        "redirect_uri": get_google_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


def exchange_google_code_for_id_token(code: str) -> str:
    if not code:
        raise HTTPException(status_code=400, detail="missing_google_code")

    body = urlencode({
        "code": code,
        "client_id": get_google_client_id(),
        "client_secret": get_google_client_secret(),
        "redirect_uri": get_google_redirect_uri(),
        "grant_type": "authorization_code",
    }).encode("utf-8")

    try:
        request = Request(
            "https://oauth2.googleapis.com/token",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urlopen(request, timeout=10) as response:
            import json
            token_payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="google_code_exchange_failed") from exc

    id_token = token_payload.get("id_token")
    if not id_token:
        raise HTTPException(status_code=401, detail="missing_google_id_token")
    return id_token


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
