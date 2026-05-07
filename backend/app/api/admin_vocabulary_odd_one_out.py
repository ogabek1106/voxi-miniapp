from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.vocabulary import VocabularyPuzzleSetIn
from app.services import vocabulary_odd_one_out_service as service

router = APIRouter(prefix="/admin/vocabulary/odd-one-out", tags=["admin-vocabulary"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/sets")
def list_sets(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, "sets": [service.serialize_set(item) for item in service.list_sets(db)]}


@router.post("/sets")
def create_set(payload: VocabularyPuzzleSetIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    puzzle_set = service.create_set(db, payload)
    return {"ok": True, "set": service.serialize_set(puzzle_set)}


@router.get("/sets/{set_id}")
def get_set(set_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    puzzle_set = service.get_set(db, set_id)
    if not puzzle_set:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    return {"ok": True, "set": service.serialize_set(puzzle_set)}


@router.put("/sets/{set_id}")
def update_set(set_id: int, payload: VocabularyPuzzleSetIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    puzzle_set = service.update_set(db, set_id, payload)
    if not puzzle_set:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    return {"ok": True, "set": service.serialize_set(puzzle_set)}


@router.delete("/sets/{set_id}")
def delete_set(set_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.delete_set(db, set_id):
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    return {"ok": True, "id": set_id}


@router.patch("/sets/{set_id}/publish")
def publish_set(set_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    puzzle_set = service.set_status(db, set_id, "published")
    if not puzzle_set:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    return {"ok": True, "set": service.serialize_set(puzzle_set)}


@router.patch("/sets/{set_id}/draft")
def draft_set(set_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    puzzle_set = service.set_status(db, set_id, "draft")
    if not puzzle_set:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    return {"ok": True, "set": service.serialize_set(puzzle_set)}
