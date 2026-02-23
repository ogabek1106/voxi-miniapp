# backend/app/api/admin_reading.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db import SessionLocal
from app.deps import get_db
from app.models import ReadingTest, ReadingTestStatus
from app.models import ReadingPassage
from app.models import ReadingQuestion
from typing import List, Any
router = APIRouter(prefix="/admin/reading", tags=["admin-reading"])


class ReadingTestCreate(BaseModel):
    title: str
    time_limit_minutes: int = 60


@router.post("/tests")
def create_reading_test(payload: ReadingTestCreate, db: Session = Depends(get_db)):
    test = ReadingTest(
        title=payload.title,
        time_limit_minutes=payload.time_limit_minutes,
        status=ReadingTestStatus.draft
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

class PassageCreate(BaseModel):
    title: Optional[str] = None
    text: str
    order_index: int


@router.post("/tests/{test_id}/passages")
def add_passage(test_id: int, payload: PassageCreate, db: Session = Depends(get_db)):
    test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found")

    passage = ReadingPassage(
        test_id=test_id,
        title=payload.title,
        text=payload.text,
        order_index=payload.order_index
    )
    db.add(passage)
    db.commit()
    db.refresh(passage)
    return passage

from typing import List, Any

class QuestionCreate(BaseModel):
    text: str
    type: str
    options: Optional[List[str]] = None
    correct_answer: Optional[Any] = None
    word_limit: Optional[int] = None
    order_index: int


@router.post("/passages/{passage_id}/questions")
def add_question(passage_id: int, payload: QuestionCreate, db: Session = Depends(get_db)):
    passage = db.query(ReadingPassage).filter(ReadingPassage.id == passage_id).first()
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    q = ReadingQuestion(
        passage_id=passage_id,
        text=payload.text,
        type=payload.type,
        options=payload.options,
        correct_answer=payload.correct_answer,
        word_limit=payload.word_limit,
        order_index=payload.order_index
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@router.post("/tests/{test_id}/publish")
def publish_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = ReadingTestStatus.published
    db.commit()
    db.refresh(test)
    return {"status": "published", "id": test.id}

@router.get("/tests")
def list_reading_tests(db: Session = Depends(get_db)):
    tests = (
        db.query(ReadingTest)
        .order_by(ReadingTest.id.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "time_limit_minutes": t.time_limit_minutes,
        }
        for t in tests
    ]
@router.get("/tests/{test_id}")
def get_reading_test(test_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.id == test_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "passages": [
            {
                "id": p.id,
                "order_index": p.order_index,
                "title": p.title,
                "text": p.text,
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "type": q.type,
                        "text": q.text,
                        "correct_answer": q.correct_answer,
                        "options": q.options,
                        "word_limit": q.word_limit,
                    }
                    for q in sorted(p.questions, key=lambda x: x.order_index)
                ]
            }
            for p in sorted(test.passages, key=lambda x: x.order_index)
        ]
    }
