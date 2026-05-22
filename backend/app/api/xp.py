from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.auth_service import get_session_user
from app.services import xp_service

router = APIRouter(prefix="/xp", tags=["xp"])


class XPSettingsIn(BaseModel):
    telegram_id: int | None = None
    nickname: str | None = None
    show_full_name: bool = False
    show_full_username: bool = True


def _current_user(db: Session, request: Request, telegram_id: int | None):
    user = get_session_user(db, request)
    if user:
        return user
    if telegram_id:
        return xp_service.resolve_user(db, telegram_id=telegram_id)
    return None


@router.get("/me")
def get_my_xp(
    request: Request,
    telegram_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(db, request, telegram_id)
    if not user and not telegram_id:
        raise HTTPException(status_code=401, detail="user_required")
    return {
        "total_xp": xp_service.get_total_xp(db, user_id=user.id if user else None, telegram_id=telegram_id),
        "history": xp_service.get_xp_history(db, user_id=user.id if user else None, telegram_id=telegram_id, limit=50),
    }


@router.get("/leaderboard")
def get_leaderboard(limit: int = Query(default=100, ge=1, le=200), db: Session = Depends(get_db)):
    return xp_service.get_leaderboard(db, limit=limit)


@router.get("/settings")
def get_settings(
    request: Request,
    telegram_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user = _current_user(db, request, telegram_id)
    if not user and not telegram_id:
        raise HTTPException(status_code=401, detail="user_required")
    settings = xp_service.get_or_create_settings(db, user, telegram_id)
    return xp_service.serialize_settings(settings)


@router.post("/settings")
def update_settings(payload: XPSettingsIn, request: Request, db: Session = Depends(get_db)):
    user = _current_user(db, request, payload.telegram_id)
    if not user and not payload.telegram_id:
        raise HTTPException(status_code=401, detail="user_required")
    settings = xp_service.update_settings(
        db,
        user=user,
        telegram_id=payload.telegram_id,
        nickname=payload.nickname,
        show_full_name=payload.show_full_name,
        show_full_username=payload.show_full_username,
    )
    return xp_service.serialize_settings(settings)
