from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import SpeakingPart, SpeakingTest, SpeakingTestStatus

router = APIRouter(prefix="/admin/speaking", tags=["admin-speaking"])


class SpeakingPartIn(BaseModel):
    part_number: int
    instruction: Optional[str] = None
    question: Optional[str] = None
    order_index: int = 0


class SpeakingTestSaveIn(BaseModel):
    id: Optional[int] = None
    title: Optional[str] = None
    time_limit_minutes: int = 18
    status: str = "draft"
    mock_pack_id: Optional[int] = None
    parts: List[SpeakingPartIn] = Field(default_factory=list)


@router.get("/tests")
def list_speaking_tests(db: Session = Depends(get_db)):
    tests = db.query(SpeakingTest).order_by(SpeakingTest.id.desc()).all()
    return [
        {
            "id": test.id,
            "title": test.title,
            "status": test.status.value if hasattr(test.status, "value") else str(test.status),
            "time_limit_minutes": test.time_limit_minutes,
            "mock_pack_id": test.mock_pack_id
        }
        for test in tests
    ]


@router.get("/tests/{test_id}")
def get_speaking_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(SpeakingTest).filter(SpeakingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Speaking test not found")

    parts = (
        db.query(SpeakingPart)
        .filter(SpeakingPart.test_id == test.id)
        .order_by(SpeakingPart.order_index.asc(), SpeakingPart.part_number.asc())
        .all()
    )

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "mock_pack_id": test.mock_pack_id,
        "parts": [
            {
                "id": part.id,
                "part_number": part.part_number,
                "instruction": part.instruction,
                "question": part.question,
                "order_index": part.order_index
            }
            for part in parts
        ]
    }


@router.post("/tests")
def save_speaking_test(payload: SpeakingTestSaveIn, db: Session = Depends(get_db)):
    try:
        safe_title = str(payload.title or "").strip()
        if not safe_title:
            if payload.mock_pack_id:
                safe_title = f"Speaking Pack {int(payload.mock_pack_id)}"
            else:
                safe_title = "Untitled Speaking"

        test = None
        if payload.id:
            test = db.query(SpeakingTest).filter(SpeakingTest.id == payload.id).first()

        if not test and payload.mock_pack_id:
            test = (
                db.query(SpeakingTest)
                .filter(SpeakingTest.mock_pack_id == payload.mock_pack_id)
                .first()
            )

        if not test:
            test = SpeakingTest(created_at=datetime.utcnow())
            db.add(test)

        test.title = safe_title
        test.time_limit_minutes = max(int(payload.time_limit_minutes or 18), 1)
        test.status = (
            SpeakingTestStatus.published
            if str(payload.status or "draft").lower() == "published"
            else SpeakingTestStatus.draft
        )
        test.mock_pack_id = payload.mock_pack_id
        test.updated_at = datetime.utcnow()
        db.flush()

        existing_parts = db.query(SpeakingPart).filter(SpeakingPart.test_id == test.id).all()
        for part in existing_parts:
            db.delete(part)
        db.flush()

        parts = sorted(payload.parts or [], key=lambda p: (int(p.order_index or 0), int(p.part_number or 0)))
        for idx, part_in in enumerate(parts, start=1):
            db.add(SpeakingPart(
                test_id=test.id,
                part_number=int(part_in.part_number or idx),
                instruction=part_in.instruction,
                question=part_in.question,
                order_index=int(part_in.order_index or idx)
            ))

        db.commit()
        db.refresh(test)
        return {"ok": True, "id": test.id}
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Speaking save failed: {str(error)}")


@router.post("/tests/{test_id}/publish")
def publish_speaking_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(SpeakingTest).filter(SpeakingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Speaking test not found")
    test.status = SpeakingTestStatus.published
    test.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(test)
    return {"status": "published", "id": test.id}


@router.delete("/tests/{test_id}")
def delete_speaking_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(SpeakingTest).filter(SpeakingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Speaking test not found")
    db.delete(test)
    db.commit()
    return {"status": "deleted", "id": test_id}
