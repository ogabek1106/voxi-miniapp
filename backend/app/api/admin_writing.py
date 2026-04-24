from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.deps import get_db
from app.models import WritingTask, WritingTest, WritingTestStatus

router = APIRouter(prefix="/admin/writing", tags=["admin-writing"])


class WritingTaskIn(BaseModel):
    task_number: int
    instruction_template: Optional[str] = None
    question_text: Optional[str] = None
    image_url: Optional[str] = None
    order_index: int = 0


class WritingTestSaveIn(BaseModel):
    id: Optional[int] = None
    title: Optional[str] = None
    time_limit_minutes: int = 60
    status: str = "draft"
    mock_pack_id: Optional[int] = None
    tasks: List[WritingTaskIn] = Field(default_factory=list)


@router.get("/tests")
def list_writing_tests(db: Session = Depends(get_db)):
    tests = db.query(WritingTest).order_by(WritingTest.id.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "time_limit_minutes": t.time_limit_minutes,
            "mock_pack_id": t.mock_pack_id
        }
        for t in tests
    ]


@router.post("/tests")
def save_writing_test(payload: WritingTestSaveIn, db: Session = Depends(get_db)):
    try:
        safe_title = str(payload.title or "").strip()
        if not safe_title:
            if payload.mock_pack_id:
                safe_title = f"Writing Pack {int(payload.mock_pack_id)}"
            else:
                safe_title = "Untitled Writing"

        test = None
        if payload.id:
            test = db.query(WritingTest).filter(WritingTest.id == payload.id).first()

        if not test and payload.mock_pack_id:
            test = (
                db.query(WritingTest)
                .filter(WritingTest.mock_pack_id == payload.mock_pack_id)
                .first()
            )

        if not test:
            test = WritingTest(created_at=datetime.utcnow())
            db.add(test)
            db.flush()

        test.title = safe_title
        test.time_limit_minutes = max(int(payload.time_limit_minutes or 60), 1)
        test.status = (
            WritingTestStatus.published
            if str(payload.status or "draft").lower() == "published"
            else WritingTestStatus.draft
        )
        test.mock_pack_id = payload.mock_pack_id
        test.updated_at = datetime.utcnow()

        existing_tasks = db.query(WritingTask).filter(WritingTask.test_id == test.id).all()
        for task in existing_tasks:
            db.delete(task)
        db.flush()

        tasks = sorted(
            payload.tasks or [],
            key=lambda t: (int(t.order_index or 0), int(t.task_number or 0))
        )
        for idx, task_in in enumerate(tasks, start=1):
            task = WritingTask(
                test_id=test.id,
                task_number=int(task_in.task_number or idx),
                instruction_template=task_in.instruction_template,
                question_text=task_in.question_text,
                image_url=task_in.image_url,
                order_index=int(task_in.order_index or idx)
            )
            db.add(task)

        db.commit()
        db.refresh(test)
        return {"ok": True, "id": test.id}
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Writing save failed: {str(error)}")


@router.get("/tests/{test_id}")
def get_writing_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(WritingTest).filter(WritingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Writing test not found")

    tasks = (
        db.query(WritingTask)
        .filter(WritingTask.test_id == test.id)
        .order_by(WritingTask.order_index.asc(), WritingTask.task_number.asc())
        .all()
    )

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "mock_pack_id": test.mock_pack_id,
        "tasks": [
            {
                "id": task.id,
                "task_number": task.task_number,
                "instruction_template": task.instruction_template,
                "question_text": task.question_text,
                "image_url": task.image_url,
                "order_index": task.order_index
            }
            for task in tasks
        ]
    }


@router.post("/tests/{test_id}/publish")
def publish_writing_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(WritingTest).filter(WritingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Writing test not found")
    test.status = WritingTestStatus.published
    test.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(test)
    return {"status": "published", "id": test.id}


@router.delete("/tests/{test_id}")
def delete_writing_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(WritingTest).filter(WritingTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Writing test not found")
    db.delete(test)
    db.commit()
    return {"status": "deleted", "id": test_id}
