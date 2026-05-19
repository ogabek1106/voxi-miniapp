from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.feedback import FeedbackSubmitIn
from app.services import feedback_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.post("")
def submit_feedback(payload: FeedbackSubmitIn, db: Session = Depends(get_db)):
    try:
        row = feedback_service.submit_feedback(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"ok": True, "feedback": feedback_service.serialize_feedback(row)}


@router.get("/admin")
def list_feedback_ratings(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, "items": feedback_service.list_admin_feedback(db)}
