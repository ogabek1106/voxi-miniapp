from fastapi import APIRouter, Body, Depends, Request, Response
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.auth import EmailLoginIn, EmailSignupIn, ProfileUpdateIn
from app.services.auth_service import (
    clear_session_cookie,
    get_session_user,
    login_email,
    login_telegram,
    require_session_user,
    safe_user,
    set_session_cookie,
    signup_email,
)
from app.services.telegram_auth_service import get_telegram_bot_id, verify_telegram_login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/email/signup")
def email_signup(payload: EmailSignupIn, response: Response, db: Session = Depends(get_db)):
    user = signup_email(db, payload.name, payload.surname, payload.email, payload.password)
    set_session_cookie(response, user)
    return {"ok": True, "user": safe_user(db, user)}


@router.post("/email/login")
def email_login(payload: EmailLoginIn, response: Response, db: Session = Depends(get_db)):
    user = login_email(db, payload.email, payload.password)
    set_session_cookie(response, user)
    return {"ok": True, "user": safe_user(db, user)}


@router.post("/telegram/login")
def telegram_login(response: Response, payload: dict = Body(...), db: Session = Depends(get_db)):
    verified = verify_telegram_login(payload)
    user = login_telegram(db, verified)
    set_session_cookie(response, user)
    return {"ok": True, "user": safe_user(db, user)}


@router.get("/telegram/config")
def telegram_config():
    return {"bot_id": get_telegram_bot_id()}


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
def auth_me(request: Request, db: Session = Depends(get_db)):
    user = require_session_user(db, request)
    return safe_user(db, user)


@router.post("/me")
def update_auth_me(payload: ProfileUpdateIn, request: Request, db: Session = Depends(get_db)):
    user = require_session_user(db, request)
    user.name = (payload.name or "").strip() or None
    user.surname = (payload.surname or "").strip() or None
    db.commit()
    db.refresh(user)
    return {"ok": True, "user": safe_user(db, user)}


@router.get("/session")
def auth_session(request: Request, db: Session = Depends(get_db)):
    user = get_session_user(db, request)
    return {"authenticated": bool(user), "user": safe_user(db, user) if user else None}
