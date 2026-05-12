from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.word_shuffle import WordShuffleSessionFinishIn, WordShuffleSessionIn
from app.services import word_shuffle_service as service

router = APIRouter(prefix="/word-shuffle", tags=["word-shuffle"])


@router.get("/game-data")
def get_game_data(db: Session = Depends(get_db)):
    return {"ok": True, **service.build_game_payload(db)}


@router.post("/sessions")
def create_session(payload: WordShuffleSessionIn, db: Session = Depends(get_db)):
    session = service.create_session(db, payload)
    return {"ok": True, "session_id": session.id}


@router.post("/sessions/{session_id}/finish")
def finish_session(session_id: int, payload: WordShuffleSessionFinishIn, db: Session = Depends(get_db)):
    session = service.finish_session(db, session_id, payload)
    return {
        "ok": True,
        "session_id": session.id,
        "score": session.score,
        "solved_count": session.solved_count,
        "best_streak": session.best_streak,
        "status": session.status,
    }
