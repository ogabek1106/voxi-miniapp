from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.premiere_service import (
    disable_premiere,
    enable_premiere,
    get_active_premiere,
    get_pack,
    serialize_premiere_pack,
)

router = APIRouter(prefix="/admin/premiere", tags=["admin-premiere"])


class PremiereEnableIn(BaseModel):
    ends_at: Optional[datetime] = None
    price_uzs: int
    label: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[str] = None


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
