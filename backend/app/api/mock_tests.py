#backend/app/api/mock_tests.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from typing import Dict
from sqlalchemy.orm import Session
from fastapi import Depends
from app.deps import get_db
from app.models import ReadingTest, ReadingPassage, ReadingQuestion, ReadingTestStatus
from typing import Dict, List
from datetime import datetime, timedelta
from app.models import ReadingProgress, User
router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])


class SubmitAnswersIn(BaseModel):
    answers: Dict[int, int]


class SubmitResultItem(BaseModel):
    question_id: int
    correct: bool


class SubmitResultOut(BaseModel):
    score: int
    total: int
    details: List[SubmitResultItem]


@router.get("/{mock_id}/reading/start")
def start_reading_test(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found for this mock")

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user.id

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user_id, ReadingProgress.test_id == test.id)
        .first()
    )

        now = datetime.utcnow()

        if not progress:
            progress = ReadingProgress(
                user_id=user_id,
                test_id=test.id,
                answers={},
                started_at=now,
                ends_at=now + timedelta(minutes=test.time_limit_minutes),
                is_submitted=False
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)
    
    passages = (
        db.query(ReadingPassage)
        .filter(ReadingPassage.test_id == test.id)
        .order_by(ReadingPassage.order_index.asc())
        .all()
    )

    result = []
    for p in passages:
        questions = (
            db.query(ReadingQuestion)
            .filter(ReadingQuestion.passage_id == p.id)
            .order_by(ReadingQuestion.order_index.asc())
            .all()
        )

        def public_meta(q):
            meta = dict(q.meta or {})
            meta.pop("variants", None)
            return meta

        result.append({
            "id": p.id,
            "title": p.title,
            "text": p.text,
            "questions": [
                {
                    "id": q.id,
                    "order_index": q.order_index,
                    "question_group_id": q.question_group_id,
                    "type": q.type.value if hasattr(q.type, "value") else str(q.type),
                    "instruction": q.instruction,
                    "content": q.content,
                    "meta": public_meta(q),
                    "points": q.points,
                    "image_url": q.image_url
                }
                for q in questions
            ]
        })

    return {
        "test_id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "timer": {
            "started_at": progress.started_at.isoformat() if progress.started_at else None,
            "ends_at": progress.ends_at.isoformat() if progress.ends_at else None,
        },
        "passages": result
    }
class ReadingSubmitIn(BaseModel):
    telegram_id: int
    answers: Dict[str, dict]

class ReadingSubmitItem(BaseModel):
    question_id: int
    correct: bool


class ReadingSubmitOut(BaseModel):
    score: int
    total: int
    details: List[ReadingSubmitItem]


@router.post("/{mock_id}/reading/submit", response_model=ReadingSubmitOut)
def submit_reading_test(mock_id: int, payload: ReadingSubmitIn, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(
            ReadingTest.id == mock_id,
            ReadingTest.status == ReadingTestStatus.published.value
        )
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found for this mock")

    # get all questions for this test
    questions = (
        db.query(ReadingQuestion)
        .join(ReadingPassage, ReadingQuestion.passage_id == ReadingPassage.id)
        .filter(ReadingPassage.test_id == test.id)
        .all()
    )

    correct_map = {q.id: q.correct_answer for q in questions}

    score = 0
    details = []

    for q_id, user_answer in payload.answers.items():
        correct_answer = correct_map.get(q_id)

        is_correct = False
        if correct_answer is not None:
            # normalize both sides for string answers
            if isinstance(correct_answer, str):
                is_correct = str(user_answer).strip().lower() == correct_answer.strip().lower()
            else:
                is_correct = user_answer == correct_answer

        if is_correct:
            score += 1

        details.append({
            "question_id": q_id,
            "correct": is_correct
        })

    return {
        "score": score,
        "total": len(correct_map),
        "details": details
    }

class ReadingSaveIn(BaseModel):
    telegram_id: int
    answers: Dict[str, dict]


@router.post("/{mock_id}/reading/save")
def save_reading_progress(mock_id: int, payload: ReadingSaveIn, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found for this mock")

    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user.id,
            ReadingProgress.test_id == test.id
        )
        .first()
    )

    now = datetime.utcnow()

    if not progress:
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            answers=payload.answers or {},
            started_at=now,
            ends_at=now + timedelta(minutes=test.time_limit_minutes),
            is_submitted=False
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
        return {"status": "saved"}

    if progress.is_submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")

    if progress.ends_at and now >= progress.ends_at:
        raise HTTPException(status_code=400, detail="Time is up")

    progress.answers = payload.answers or {}
    progress.updated_at = now

    db.add(progress)
    db.commit()

    return {"status": "saved"}

@router.get("/{mock_id}/reading/resume")
def resume_reading_progress(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found for this mock")

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user.id,
            ReadingProgress.test_id == test.id
        )
        .first()
    )

    if not progress:
        return {
            "answers": {},
            "started_at": None,
            "updated_at": None,
            "ends_at": None,
            "is_submitted": False,
            "submitted_at": None,
            "raw_score": None,
            "max_score": None,
            "band_score": None
        }

    return {
        "answers": progress.answers or {},
        "started_at": progress.started_at,
        "updated_at": progress.updated_at,
        "ends_at": progress.ends_at,
        "is_submitted": progress.is_submitted,
        "submitted_at": progress.submitted_at,
        "raw_score": progress.raw_score,
        "max_score": progress.max_score,
        "band_score": float(progress.band_score) if progress.band_score is not None else None
    }

