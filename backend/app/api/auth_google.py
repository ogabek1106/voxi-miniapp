from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.google_auth import GoogleLoginIn
from app.services.auth_service import safe_user, set_session_cookie
from app.services.google_auth_service import (
    build_google_auth_url,
    exchange_google_code_for_id_token,
    get_google_client_id,
    get_google_success_redirect_url,
    login_google_user,
)

router = APIRouter(prefix="/auth/google", tags=["auth"])


@router.get("/config")
def google_config():
    return {
        "client_id": get_google_client_id(),
    }


@router.get("/login")
def google_login_redirect():
    return RedirectResponse(build_google_auth_url(), status_code=302)


@router.get("/callback")
def google_callback(
    code: str = Query(default=""),
    db: Session = Depends(get_db),
):
    id_token = exchange_google_code_for_id_token(code)
    user = login_google_user(db, id_token)
    response = RedirectResponse(get_google_success_redirect_url(), status_code=302)
    set_session_cookie(response, user)
    return response


@router.post("/login")
def google_login(payload: GoogleLoginIn, response: Response, db: Session = Depends(get_db)):
    user = login_google_user(db, payload.id_token)
    set_session_cookie(response, user)
    return {"ok": True, "user": safe_user(db, user)}
