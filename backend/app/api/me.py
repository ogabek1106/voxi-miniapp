# backend/app/api/me.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models import User, ReadingProgress, ReadingTest
from app.config import ADMIN_IDS
from app.api.mock_tests import _auto_submitted_at, _finalize_progress, _is_time_up, _query_questions_for_test, _utcnow

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

    # Auto-submit expired unfinished attempts for this user.
    now = _utcnow()
    open_attempts = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user.id,
            ReadingProgress.is_submitted == False,
            ReadingProgress.ends_at != None
        )
        .all()
    )
    changed = False
    questions_cache = {}
    for progress in open_attempts:
        if not _is_time_up(progress.ends_at, now):
            continue
        if progress.test_id not in questions_cache:
            questions_cache[progress.test_id] = _query_questions_for_test(db, progress.test_id)
        _finalize_progress(progress, questions_cache[progress.test_id], _auto_submitted_at(progress.ends_at, now))
        db.add(progress)
        changed = True
    if changed:
        db.commit()

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
