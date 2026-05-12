from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.word_shuffle import WordShuffleEntryIn
from app.services import word_shuffle_service as service

router = APIRouter(prefix="/admin/word-shuffle", tags=["admin-word-shuffle"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/entries")
def list_entries(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, "entries": [service.serialize_entry(item) for item in service.list_entries(db)]}


@router.get("/stats")
def get_stats(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, **service.list_admin_stats(db)}


@router.post("/entries")
def create_entry(payload: WordShuffleEntryIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    entry = service.create_entry(db, payload)
    return {"ok": True, "entry": service.serialize_entry(entry)}


@router.put("/entries/{entry_id}")
def update_entry(entry_id: int, payload: WordShuffleEntryIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    entry = service.update_entry(db, entry_id, payload)
    if not entry:
        raise HTTPException(status_code=404, detail="word_shuffle_entry_not_found")
    return {"ok": True, "entry": service.serialize_entry(entry)}


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.delete_entry(db, entry_id):
        raise HTTPException(status_code=404, detail="word_shuffle_entry_not_found")
    return {"ok": True, "id": entry_id}


@router.patch("/entries/{entry_id}/activate")
def activate_entry(entry_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    entry = service.set_status(db, entry_id, "active")
    if not entry:
        raise HTTPException(status_code=404, detail="word_shuffle_entry_not_found")
    return {"ok": True, "entry": service.serialize_entry(entry)}


@router.patch("/entries/{entry_id}/deactivate")
def deactivate_entry(entry_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    entry = service.set_status(db, entry_id, "inactive")
    if not entry:
        raise HTTPException(status_code=404, detail="word_shuffle_entry_not_found")
    return {"ok": True, "entry": service.serialize_entry(entry)}
