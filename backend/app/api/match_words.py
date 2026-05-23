from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.match_words import MatchWordsSessionFinishIn, MatchWordsSessionIn
from app.services import match_words_service as service

router = APIRouter(prefix="/match-words", tags=["match-words"])


@router.get("/game-data")
def get_game_data(db: Session = Depends(get_db)):
    return {"ok": True, **service.build_game_payload(db)}


@router.post("/sessions")
def create_session(payload: MatchWordsSessionIn, db: Session = Depends(get_db)):
    session = service.create_session(db, payload)
    return {"ok": True, "session_id": session.id}


@router.post("/sessions/{session_id}/finish")
def finish_session(session_id: int, payload: MatchWordsSessionFinishIn, db: Session = Depends(get_db)):
    session = service.finish_session(db, session_id, payload)
    return {
        "ok": True,
        "session_id": session.id,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "best_combo": session.best_combo,
        "survived_seconds": session.survived_seconds,
        "average_match_seconds": session.average_match_seconds,
        "xp_earned": session.xp_earned,
        "status": session.status,
    }
