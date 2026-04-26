from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_FLOOR
from typing import Any, Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    FullMockResult,
    MockPack,
    ReadingProgress,
    ReadingTest,
    User,
    SpeakingProgress,
    SpeakingResult,
    SpeakingTest,
    WritingProgress,
    WritingTask,
    WritingTest,
)
from app.services.writing_ai_checker import check_writing_progress


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_valid_band(value: Any) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric < 0.0 or numeric > 9.0:
        return None
    doubled = numeric * 2.0
    if abs(doubled - round(doubled)) > 1e-9:
        return None
    return numeric


def calculate_overall_band(
    listening_band: float,
    reading_band: float,
    writing_band: float,
    speaking_band: float,
) -> Dict[str, float]:
    values = [listening_band, reading_band, writing_band, speaking_band]
    for value in values:
        if not isinstance(value, (int, float)):
            raise ValueError("All section bands must be numbers")
        numeric = float(value)
        if numeric < 0.0 or numeric > 9.0:
            raise ValueError("All section bands must be between 0 and 9")

    raw_average = float(sum(float(v) for v in values) / 4.0)

    # IELTS official style:
    # < .25 -> lower whole
    # .25-.74 -> .5
    # >= .75 -> next whole
    floor_whole = Decimal(str(raw_average)).to_integral_value(rounding=ROUND_FLOOR)
    frac = Decimal(str(raw_average)) - floor_whole
    base = float(floor_whole)

    if frac < Decimal("0.25"):
        overall = base
    elif frac < Decimal("0.75"):
        overall = base + 0.5
    else:
        overall = base + 1.0

    overall = max(0.0, min(9.0, overall))
    return {
        "raw_average": raw_average,
        "overall_band": overall,
    }


def _get_reading_band(db: Session, mock_id: int, telegram_id: int) -> float | None:
    test = db.query(ReadingTest).filter(ReadingTest.mock_pack_id == mock_id).first()
    if not test:
        return None
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        return None
    progress = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.test_id == test.id,
            ReadingProgress.user_id == user.id,
        )
        .first()
    )
    if not progress:
        return None
    return _to_valid_band(progress.band_score)


def _get_writing_band(db: Session, mock_id: int, telegram_id: int) -> float | None:
    test = db.query(WritingTest).filter(WritingTest.mock_pack_id == mock_id).first()
    if not test:
        return None
    progress = (
        db.query(WritingProgress)
        .filter(
            WritingProgress.test_id == test.id,
            WritingProgress.telegram_id == telegram_id,
        )
        .first()
    )
    if not progress or not progress.is_submitted:
        return None

    band = _to_valid_band(progress.ai_overall_band)
    if band is not None:
        return band

    tasks = (
        db.query(WritingTask)
        .filter(WritingTask.test_id == test.id)
        .order_by(WritingTask.task_number.asc(), WritingTask.order_index.asc())
        .all()
    )
    ai_result = check_writing_progress(db, progress, tasks)

    progress.ai_checked_at = _utcnow()
    progress.ai_overall_band = float(ai_result["overall_writing_band"])
    progress.ai_task1_result = ai_result["task1"]
    progress.ai_task2_result = ai_result["task2"]
    progress.ai_task1_band = float(ai_result["task1"]["overall_band"])
    progress.ai_task2_band = float(ai_result["task2"]["overall_band"])
    progress.updated_at = _utcnow()
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return _to_valid_band(progress.ai_overall_band)


def _get_speaking_band(db: Session, mock_id: int, telegram_id: int) -> float | None:
    test = db.query(SpeakingTest).filter(SpeakingTest.mock_pack_id == mock_id).first()
    if not test:
        return None
    progress = (
        db.query(SpeakingProgress)
        .filter(
            SpeakingProgress.test_id == test.id,
            SpeakingProgress.telegram_id == telegram_id,
        )
        .first()
    )
    if not progress:
        return None
    result = (
        db.query(SpeakingResult)
        .filter(SpeakingResult.progress_id == progress.id)
        .first()
    )
    if not result:
        return None
    return _to_valid_band(result.overall_band)


def _get_listening_band(db: Session, mock_id: int, telegram_id: int) -> float | None:
    # Listening score persistence is not wired yet on backend.
    # Keep this source explicit for safe pending state until listening check is connected.
    existing = (
        db.query(FullMockResult)
        .filter(
            FullMockResult.mock_pack_id == mock_id,
            FullMockResult.telegram_id == telegram_id,
        )
        .first()
    )
    if not existing:
        return None
    return _to_valid_band(existing.listening_band)


def _upsert_result_row(
    db: Session,
    mock_id: int,
    telegram_id: int,
    listening_band: float | None,
    reading_band: float | None,
    writing_band: float | None,
    speaking_band: float | None,
    raw_average: float | None,
    overall_band: float | None,
    status: str,
) -> FullMockResult:
    row = (
        db.query(FullMockResult)
        .filter(
            FullMockResult.mock_pack_id == mock_id,
            FullMockResult.telegram_id == telegram_id,
        )
        .first()
    )
    if not row:
        row = FullMockResult(mock_pack_id=mock_id, telegram_id=telegram_id)

    row.listening_band = listening_band
    row.reading_band = reading_band
    row.writing_band = writing_band
    row.speaking_band = speaking_band
    row.raw_average_band = raw_average
    row.overall_band = overall_band
    row.status = status
    row.completed_at = _utcnow() if status == "completed" else None
    row.updated_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def build_full_mock_result(db: Session, mock_id: int, telegram_id: int) -> Dict[str, Any]:
    mock_pack = db.query(MockPack).filter(MockPack.id == mock_id).first()
    if not mock_pack:
        raise HTTPException(status_code=404, detail="Mock pack not found")

    listening_band = _get_listening_band(db, mock_id, telegram_id)
    reading_band = _get_reading_band(db, mock_id, telegram_id)
    writing_band = _get_writing_band(db, mock_id, telegram_id)
    speaking_band = _get_speaking_band(db, mock_id, telegram_id)

    pending_parts: List[str] = []
    if listening_band is None:
        pending_parts.append("listening")
    if reading_band is None:
        pending_parts.append("reading")
    if writing_band is None:
        pending_parts.append("writing")
    if speaking_band is None:
        pending_parts.append("speaking")

    if pending_parts:
        row = _upsert_result_row(
            db=db,
            mock_id=mock_id,
            telegram_id=telegram_id,
            listening_band=listening_band,
            reading_band=reading_band,
            writing_band=writing_band,
            speaking_band=speaking_band,
            raw_average=None,
            overall_band=None,
            status="pending",
        )
        return {
            "status": "pending",
            "pending_parts": pending_parts,
            "listening_band": listening_band,
            "reading_band": reading_band,
            "writing_band": writing_band,
            "speaking_band": speaking_band,
            "raw_average_band": row.raw_average_band,
            "overall_band": row.overall_band,
            "completed_at": row.completed_at.isoformat() if row.completed_at else None,
        }

    calc = calculate_overall_band(
        listening_band=listening_band,
        reading_band=reading_band,
        writing_band=writing_band,
        speaking_band=speaking_band,
    )
    row = _upsert_result_row(
        db=db,
        mock_id=mock_id,
        telegram_id=telegram_id,
        listening_band=listening_band,
        reading_band=reading_band,
        writing_band=writing_band,
        speaking_band=speaking_band,
        raw_average=calc["raw_average"],
        overall_band=calc["overall_band"],
        status="completed",
    )
    return {
        "status": "completed",
        "pending_parts": [],
        "listening_band": listening_band,
        "reading_band": reading_band,
        "writing_band": writing_band,
        "speaking_band": speaking_band,
        "raw_average_band": float(row.raw_average_band) if row.raw_average_band is not None else None,
        "overall_band": float(row.overall_band) if row.overall_band is not None else None,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }
