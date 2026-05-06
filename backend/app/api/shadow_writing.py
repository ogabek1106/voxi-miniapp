from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.shadow_writing import ShadowWritingAttemptIn
from app.services import shadow_writing_service as service

router = APIRouter(prefix="/shadow-writing", tags=["shadow-writing"])


@router.get("/next")
def get_next_shadow_writing(telegram_id: int, db: Session = Depends(get_db)):
    attempt = service.start_next_attempt(db, telegram_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="no_shadow_writing_essays")

    return {
        "ok": True,
        "attempt_id": attempt.id,
        "essay": service.serialize_essay(attempt.essay),
    }


@router.post("/attempts")
def complete_shadow_writing_attempt(payload: ShadowWritingAttemptIn, db: Session = Depends(get_db)):
    attempt = service.complete_attempt(db, payload)
    if not attempt:
        raise HTTPException(status_code=404, detail="shadow_writing_attempt_not_found")
    return {"ok": True, "attempt": service.serialize_attempt(attempt)}


@router.get("/history")
def get_shadow_writing_history(telegram_id: int, db: Session = Depends(get_db)):
    attempts = service.list_history(db, telegram_id)
    return {"ok": True, "history": [service.serialize_attempt(attempt) for attempt in attempts]}
