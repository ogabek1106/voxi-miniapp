from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import PremiereAccess, User
from app.services.premiere_service import (
    disable_premiere,
    enable_premiere,
    get_active_premiere,
    get_pack,
    normalize_email,
    to_utc,
    utcnow,
    serialize_premiere_pack,
)
from app.services.vcoin_admin_service import serialize_admin_user

router = APIRouter(prefix="/admin/premiere", tags=["admin-premiere"])


class PremiereEnableIn(BaseModel):
    ends_at: Optional[datetime] = None
    price_uzs: int
    label: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[str] = None


class PremiereSubscriptionGrantIn(BaseModel):
    admin_id: int
    target_user_id: int
    mock_pack_id: Optional[int] = None


def require_admin_id(admin_id: int):
    if int(admin_id) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/status")
def get_premiere_status(db: Session = Depends(get_db)):
    active = get_active_premiere(db)
    return {
        "active": bool(active),
        "premiere": serialize_premiere_pack(active),
    }


@router.get("/{pack_id}")
def get_pack_premiere(pack_id: int, db: Session = Depends(get_db)):
    pack = get_pack(db, pack_id)
    active = get_active_premiere(db)
    return {
        "pack": serialize_premiere_pack(pack),
        "active_premiere_id": active.id if active else None,
    }


@router.post("/{pack_id}/enable")
def enable_pack_premiere(pack_id: int, payload: PremiereEnableIn, db: Session = Depends(get_db)):
    pack = enable_premiere(
        db,
        pack_id=pack_id,
        ends_at=payload.ends_at,
        price_uzs=payload.price_uzs,
        label=payload.label,
        description=payload.description,
        theme=payload.theme,
    )
    return serialize_premiere_pack(pack)


@router.post("/{pack_id}/disable")
def disable_pack_premiere(pack_id: int, db: Session = Depends(get_db)):
    pack = disable_premiere(db, pack_id)
    return serialize_premiere_pack(pack)


def _serialize_premiere_access(access: PremiereAccess) -> dict:
    return {
        "id": access.id,
        "mock_pack_id": access.mock_pack_id,
        "telegram_id": access.telegram_id,
        "user_id": access.user_id,
        "email": access.email,
        "status": access.status,
        "created_at": access.created_at.isoformat() if access.created_at else None,
        "expires_at": access.expires_at.isoformat() if access.expires_at else None,
    }


@router.post("/subscriptions/grant")
def grant_premiere_subscription(payload: PremiereSubscriptionGrantIn, db: Session = Depends(get_db)):
    require_admin_id(payload.admin_id)
    user = db.query(User).filter(User.id == int(payload.target_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    pack = get_pack(db, payload.mock_pack_id) if payload.mock_pack_id else get_active_premiere(db)
    if not pack:
        raise HTTPException(status_code=404, detail="active_premiere_not_found")

    normalized_email = normalize_email(user.email)
    filters = [PremiereAccess.user_id == int(user.id)]
    if user.telegram_id:
        filters.append(PremiereAccess.telegram_id == int(user.telegram_id))
    if normalized_email:
        filters.append(PremiereAccess.email == normalized_email)

    access = (
        db.query(PremiereAccess)
        .filter(PremiereAccess.mock_pack_id == int(pack.id))
        .filter(PremiereAccess.status == "active")
        .filter(or_(*filters))
        .order_by(PremiereAccess.id.desc())
        .first()
    )
    if not access:
        access = PremiereAccess(
            mock_pack_id=int(pack.id),
            created_at=utcnow(),
            status="active",
        )

    access.user_id = int(user.id)
    access.telegram_id = int(user.telegram_id) if user.telegram_id else None
    access.email = normalized_email
    access.expires_at = to_utc(pack.premiere_ends_at)
    access.status = "active"
    db.add(access)
    db.commit()
    db.refresh(access)

    return {
        "ok": True,
        "user": serialize_admin_user(user),
        "premiere": serialize_premiere_pack(pack),
        "access": _serialize_premiere_access(access),
    }
