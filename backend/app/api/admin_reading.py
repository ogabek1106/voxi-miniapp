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
from app.models import ReadingQuestionType
import traceback
import json

router = APIRouter(prefix="/admin/reading", tags=["admin-reading"])


class ReadingTestCreate(BaseModel):
    title: str
    time_limit_minutes: int = 60
    mock_pack_id: int
class ReadingTestUpdate(BaseModel):
    title: str
    time_limit_minutes: int = 60

@router.post("/tests")
def create_reading_test(payload: ReadingTestCreate, db: Session = Depends(get_db)):
    test = ReadingTest(
        title=payload.title,
        time_limit_minutes=payload.time_limit_minutes,
        status=ReadingTestStatus.draft,
        mock_pack_id=payload.mock_pack_id
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

class PassageCreate(BaseModel):
    title: Optional[str] = None
    text: str
    order_index: int
    image_url: Optional[str] = None


@router.post("/tests/{test_id}/passages")
def add_passage(test_id: int, payload: PassageCreate, db: Session = Depends(get_db)):
    try:
        test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Reading test not found")

        passage = ReadingPassage(
            test_id=test_id,
            title=payload.title,
            text=payload.text,
            image_url=payload.image_url,
            order_index=payload.order_index
        )
        db.add(passage)
        db.commit()
        db.refresh(passage)
        return passage

    except Exception as e:
        print("❌ ERROR in add_passage:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from typing import List, Any

class QuestionCreate(BaseModel):
    type: ReadingQuestionType
    order_index: int

    instruction: Optional[str] = None
    content: dict
    correct_answer: dict
    image_url: Optional[str] = None
    meta: Optional[dict] = None
    explanation: Optional[str] = None
    points: Optional[int] = 1


@router.post("/passages/{passage_id}/questions")
def add_question(passage_id: int, payload: QuestionCreate, db: Session = Depends(get_db)):
    try:
        passage = db.query(ReadingPassage).filter(ReadingPassage.id == passage_id).first()
        if not passage:
            raise HTTPException(status_code=404, detail="Passage not found")

        if not payload.content:
            raise HTTPException(status_code=400, detail="content is required")

        if not payload.correct_answer:
            raise HTTPException(status_code=400, detail="correct_answer is required")
        
        q = ReadingQuestion(
            passage_id=passage_id,
            type=payload.type,
            order_index=payload.order_index,
            instruction=payload.instruction,
            content=payload.content,
            correct_answer=payload.correct_answer,
            image_url=payload.image_url,
            meta=payload.meta,
            explanation=payload.explanation,
            points=payload.points,
        )        
        db.add(q)
        db.commit()
        db.refresh(q)
        return q

    except Exception as e:
        print("❌ ERROR in add_question:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
                "image_url": p.image_url,
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "type": q.type.value if hasattr(q.type, "value") else str(q.type),
                        "instruction": q.instruction,
                        "content": json.loads(q.content) if isinstance(q.content, str) else q.content,
                        "content_type": str(type(q.content)),
                        "correct_answer": q.correct_answer,
                        "image_url": q.image_url,
                        "meta": q.meta,
                        "explanation": q.explanation,
                        "points": q.points,
                    }
                    for q in sorted(p.questions, key=lambda x: x.order_index)
                ]
            }
            for p in sorted(test.passages, key=lambda x: x.order_index)
        ]
    }

@router.put("/tests/{test_id}")
def update_reading_test(test_id: int, payload: ReadingTestUpdate, db: Session = Depends(get_db)):
    test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found")

    test.title = payload.title
    test.time_limit_minutes = payload.time_limit_minutes
    db.commit()
    db.refresh(test)
    return test

@router.delete("/passages/{passage_id}")
def delete_passage(passage_id: int, db: Session = Depends(get_db)):
    passage = db.query(ReadingPassage).filter(ReadingPassage.id == passage_id).first()
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    db.delete(passage)
    db.commit()
    return {"status": "deleted", "id": passage_id}

@router.delete("/tests/{test_id}")
def delete_reading_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # 1) get passage ids
    passage_ids = [
        p.id for p in db.query(ReadingPassage.id)
        .filter(ReadingPassage.test_id == test_id)
        .all()
    ]

    if passage_ids:
        # 2) delete questions by passage_ids
        db.query(ReadingQuestion)\
          .filter(ReadingQuestion.passage_id.in_(passage_ids))\
          .delete(synchronize_session=False)

        # 3) delete passages
        db.query(ReadingPassage)\
          .filter(ReadingPassage.id.in_(passage_ids))\
          .delete(synchronize_session=False)

    # 4) delete test
    db.delete(test)
    db.commit()

    return {"status": "deleted", "id": test_id}

@router.post("/tests/{test_id}/unpublish")
def unpublish_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(ReadingTest).filter(ReadingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = ReadingTestStatus.draft
    db.commit()
    db.refresh(test)
    return {"status": "draft", "id": test.id}
