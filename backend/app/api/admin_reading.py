# backend/app/api/admin_reading.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import SessionLocal
from app.deps import get_db
from app.models import ReadingTest, ReadingTestStatus

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
