from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.vocabulary import VocabularyOddOneOutAttemptIn, VocabularyPuzzleCheckIn
from app.services import vocabulary_odd_one_out_service as service

router = APIRouter(prefix="/vocabulary/odd-one-out", tags=["vocabulary"])


@router.get("/session")
def get_session(db: Session = Depends(get_db)):
    return {"ok": True, "sets": service.build_session(db)}


@router.post("/check")
def check_answer(payload: VocabularyPuzzleCheckIn, db: Session = Depends(get_db)):
    return {
        "ok": True,
        **service.check_answer(
            db,
            payload.set_id,
            payload.selected_word_id,
            timed_out=payload.timed_out,
        ),
    }


@router.post("/attempts")
def record_attempt(payload: VocabularyOddOneOutAttemptIn, db: Session = Depends(get_db)):
    attempt = service.record_attempt(db, payload)
    return {"ok": True, "attempt_id": attempt.id}
