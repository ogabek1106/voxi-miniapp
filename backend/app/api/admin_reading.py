# backend/app/api/admin_reading.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db import SessionLocal
from app.deps import get_db
from app.models import ReadingTest, ReadingTestStatus
from app.models import ReadingPassage

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
