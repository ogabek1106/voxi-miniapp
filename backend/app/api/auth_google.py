from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.google_auth import GoogleLoginIn
from app.services.auth_service import safe_user, set_session_cookie
from app.services.google_auth_service import get_google_client_id, login_google_user

router = APIRouter(prefix="/auth/google", tags=["auth"])


@router.get("/config")
def google_config():
    return {"client_id": get_google_client_id()}


@router.post("/login")
def google_login(payload: GoogleLoginIn, response: Response, db: Session = Depends(get_db)):
    user = login_google_user(db, payload.id_token)
    set_session_cookie(response, user)
    return {"ok": True, "user": safe_user(db, user)}
