from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.word_merge import WordMergeSessionFinishIn, WordMergeSessionIn
from app.services import word_merge_service as service

router = APIRouter(prefix="/word-merge", tags=["word-merge"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/game-data")
def get_game_data(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, **service.build_game_payload(db)}


@router.post("/sessions")
def create_session(payload: WordMergeSessionIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    session = service.create_session(db, payload)
    return {"ok": True, "session_id": session.id}


@router.post("/sessions/{session_id}/finish")
def finish_session(session_id: int, payload: WordMergeSessionFinishIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    session = service.finish_session(db, session_id, payload)
    return {
        "ok": True,
        "session_id": session.id,
        "score": session.score,
        "mastered_count": session.mastered_count,
        "moves_count": session.moves_count,
        "status": session.status,
    }
