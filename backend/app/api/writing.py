from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import WritingProgress, WritingTask, WritingTest, WritingTestStatus

router = APIRouter(prefix="/mock-tests", tags=["writing"])


class WritingStartIn(BaseModel):
    telegram_id: int


class WritingSaveIn(BaseModel):
    telegram_id: int
    task1_text: Optional[str] = None
    task1_image_url: Optional[str] = None
    task2_text: Optional[str] = None
    task2_image_url: Optional[str] = None


class WritingSubmitIn(WritingSaveIn):
    finish_type: str = "manual"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _writing_deadline(progress: WritingProgress, test: WritingTest) -> datetime | None:
    if not progress.started_at:
        return None
    started = _to_utc(progress.started_at)
    return started + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1))


def _is_time_up(progress: WritingProgress, test: WritingTest, now: datetime | None = None) -> bool:
    deadline = _writing_deadline(progress, test)
    if deadline is None:
        return False
    current = _to_utc(now or _utcnow())
    return current >= deadline


def _finalize(progress: WritingProgress, test: WritingTest, finish_type: str, now: datetime | None = None):
    current = _to_utc(now or _utcnow())
    mode = str(finish_type or "").strip().lower()

    if mode == "auto":
        deadline = _writing_deadline(progress, test)
        submitted_at = deadline if deadline and deadline <= current else current
    else:
        submitted_at = current
        mode = "manual"

    progress.is_submitted = True
    progress.submitted_at = submitted_at
    progress.finish_type = "auto" if mode == "auto" else "manual"
    progress.updated_at = submitted_at


def _resolve_test_for_mock(db: Session, mock_id: int, telegram_id: int) -> WritingTest:
    test = (
        db.query(WritingTest)
        .filter(WritingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Writing test not found for this mock")

    is_admin = int(telegram_id) in ADMIN_IDS
    if not is_admin and str(test.status.value if hasattr(test.status, "value") else test.status) != WritingTestStatus.published.value:
        raise HTTPException(status_code=404, detail="Writing test not found for this mock")
    return test


def _serialize_tasks(db: Session, test_id: int):
    tasks = (
        db.query(WritingTask)
        .filter(WritingTask.test_id == test_id)
        .order_by(WritingTask.order_index.asc(), WritingTask.task_number.asc())
        .all()
    )
    return [
        {
            "id": task.id,
            "task_number": task.task_number,
            "instruction_template": task.instruction_template,
            "question_text": task.question_text,
            "image_url": task.image_url,
            "order_index": task.order_index,
            "instruction": f"{(task.instruction_template or '').strip()} {(task.question_text or '').strip()}".strip()
        }
        for task in tasks
    ]


def _serialize_progress(progress: WritingProgress | None):
    if not progress:
        return None
    return {
        "task1_text": progress.task1_text,
        "task1_image_url": progress.task1_image_url,
        "task2_text": progress.task2_text,
        "task2_image_url": progress.task2_image_url,
        "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
        "updated_at": _to_utc(progress.updated_at).isoformat() if progress.updated_at else None,
        "submitted_at": _to_utc(progress.submitted_at).isoformat() if progress.submitted_at else None,
        "is_submitted": bool(progress.is_submitted),
        "finish_type": progress.finish_type
    }


@router.post("/{mock_id}/writing/start")
def start_writing(mock_id: int, payload: WritingStartIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id, payload.telegram_id)
    now = _utcnow()

    progress = (
        db.query(WritingProgress)
        .filter(
            WritingProgress.test_id == test.id,
            WritingProgress.telegram_id == payload.telegram_id
        )
        .first()
    )

    if not progress:
        progress = WritingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            updated_at=now,
            is_submitted=False,
            finish_type=None
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    elif not progress.is_submitted and _is_time_up(progress, test, now):
        _finalize(progress, test, "auto", now)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    deadline = _writing_deadline(progress, test)
    duration_seconds = max(int(test.time_limit_minutes or 60), 1) * 60

    return {
        "mock_id": mock_id,
        "test_id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "already_submitted": bool(progress.is_submitted),
        "timer": {
            "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
            "ends_at": deadline.isoformat() if deadline else None,
            "duration_seconds": duration_seconds
        },
        "tasks": _serialize_tasks(db, test.id),
        "progress": _serialize_progress(progress)
    }


@router.post("/{mock_id}/writing/save")
def save_writing(mock_id: int, payload: WritingSaveIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id, payload.telegram_id)
    now = _utcnow()
    is_admin = int(payload.telegram_id) in ADMIN_IDS

    progress = (
        db.query(WritingProgress)
        .filter(
            WritingProgress.test_id == test.id,
            WritingProgress.telegram_id == payload.telegram_id
        )
        .first()
    )

    if not progress:
        progress = WritingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            updated_at=now,
            is_submitted=False
        )

    if progress.is_submitted and not is_admin:
        return {"status": "already_submitted"}

    if progress.is_submitted and is_admin:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.finish_type = None
        progress.started_at = now

    progress.task1_text = payload.task1_text
    progress.task1_image_url = payload.task1_image_url
    progress.task2_text = payload.task2_text
    progress.task2_image_url = payload.task2_image_url
    progress.updated_at = now

    if _is_time_up(progress, test, now):
        _finalize(progress, test, "auto", now)
        db.add(progress)
        db.commit()
        return {"status": "auto_submitted"}

    db.add(progress)
    db.commit()
    return {"status": "saved"}


@router.post("/{mock_id}/writing/submit")
def submit_writing(mock_id: int, payload: WritingSubmitIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id, payload.telegram_id)
    now = _utcnow()
    is_admin = int(payload.telegram_id) in ADMIN_IDS

    progress = (
        db.query(WritingProgress)
        .filter(
            WritingProgress.test_id == test.id,
            WritingProgress.telegram_id == payload.telegram_id
        )
        .first()
    )
    if not progress:
        progress = WritingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            updated_at=now,
            is_submitted=False
        )

    if progress.is_submitted and not is_admin:
        return {"status": "already_submitted", "progress": _serialize_progress(progress)}

    if progress.is_submitted and is_admin:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.finish_type = None
        progress.started_at = now

    progress.task1_text = payload.task1_text
    progress.task1_image_url = payload.task1_image_url
    progress.task2_text = payload.task2_text
    progress.task2_image_url = payload.task2_image_url
    progress.updated_at = now

    mode = "auto" if str(payload.finish_type or "").lower() == "auto" or _is_time_up(progress, test, now) else "manual"
    _finalize(progress, test, mode, now)
    db.add(progress)
    db.commit()
    db.refresh(progress)

    return {"status": "submitted", "progress": _serialize_progress(progress)}


@router.get("/{mock_id}/writing/resume")
def resume_writing(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id, telegram_id)
    now = _utcnow()

    progress = (
        db.query(WritingProgress)
        .filter(
            WritingProgress.test_id == test.id,
            WritingProgress.telegram_id == telegram_id
        )
        .first()
    )

    if progress and not progress.is_submitted and _is_time_up(progress, test, now):
        _finalize(progress, test, "auto", now)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    deadline = _writing_deadline(progress, test) if progress else None
    return {
        "mock_id": mock_id,
        "test_id": test.id,
        "time_limit_minutes": test.time_limit_minutes,
        "timer": {
            "started_at": _to_utc(progress.started_at).isoformat() if progress and progress.started_at else None,
            "ends_at": deadline.isoformat() if deadline else None,
            "duration_seconds": max(int(test.time_limit_minutes or 60), 1) * 60
        },
        "progress": _serialize_progress(progress)
    }
