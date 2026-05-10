from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.word_merge import WordMergeFamilyIn
from app.services import word_merge_service as service

router = APIRouter(prefix="/admin/word-merge", tags=["admin-word-merge"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/families")
def list_families(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, "families": [service.serialize_family(item) for item in service.list_families(db)]}


@router.post("/families")
def create_family(payload: WordMergeFamilyIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    family = service.create_family(db, payload)
    return {"ok": True, "family": service.serialize_family(family)}


@router.get("/families/{family_id}")
def get_family(family_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    family = service.get_family(db, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="word_merge_family_not_found")
    return {"ok": True, "family": service.serialize_family(family)}


@router.put("/families/{family_id}")
def update_family(family_id: int, payload: WordMergeFamilyIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    family = service.update_family(db, family_id, payload)
    if not family:
        raise HTTPException(status_code=404, detail="word_merge_family_not_found")
    return {"ok": True, "family": service.serialize_family(family)}


@router.delete("/families/{family_id}")
def delete_family(family_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.delete_family(db, family_id):
        raise HTTPException(status_code=404, detail="word_merge_family_not_found")
    return {"ok": True, "id": family_id}


@router.patch("/families/{family_id}/activate")
def activate_family(family_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    family = service.set_status(db, family_id, "active")
    if not family:
        raise HTTPException(status_code=404, detail="word_merge_family_not_found")
    return {"ok": True, "family": service.serialize_family(family)}


@router.patch("/families/{family_id}/deactivate")
def deactivate_family(family_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    family = service.set_status(db, family_id, "inactive")
    if not family:
        raise HTTPException(status_code=404, detail="word_merge_family_not_found")
    return {"ok": True, "family": service.serialize_family(family)}


@router.get("/stats")
def get_stats(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, **service.simple_stats(db)}
