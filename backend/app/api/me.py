# backend/app/api/me.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models import User, ReadingProgress, ReadingTest
from app.config import ADMIN_IDS

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None

@router.get("/me")
def get_me(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(telegram_id=telegram_id, name=None)
        db.add(user)
        db.commit()
        db.refresh(user)

    # get last finished reading attempt
    last = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user.id,
            ReadingProgress.submitted_at != None
        )
        .order_by(ReadingProgress.submitted_at.desc())
        .first()
    )

    last_activity = None

    if last:
        test = db.query(ReadingTest).filter(ReadingTest.id == last.test_id).first()

        score = None
        if last.raw_score is not None and last.max_score is not None:
            score = f"{last.raw_score}/{last.max_score}"

        last_activity = {
            "reading_title": test.title if test else "Reading",
            "score": score,
            "band": last.band_score
        }
    return {
        "name": user.name,
        "surname": user.surname,
        "is_admin": user.telegram_id in ADMIN_IDS,
        "last_activity": last_activity
    }


@router.post("/me")
def update_me(telegram_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(telegram_id=telegram_id)
        db.add(user)

    user.name = data.name
    user.surname = data.surname
    db.commit()
    return {"status": "ok"}
