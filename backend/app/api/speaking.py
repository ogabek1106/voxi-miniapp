from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import SpeakingPart, SpeakingProgress, SpeakingResult, SpeakingTest
from app.services.vcoin_service import require_paid_access_or_spend
from app.services.speaking_ai_checker import check_speaking_progress

import os
from uuid import uuid4


router = APIRouter(tags=["speaking"])

UPLOAD_DIR = "/data/media"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class SpeakingStartIn(BaseModel):
    telegram_id: int


class SpeakingSaveIn(BaseModel):
    telegram_id: int
    part_number: int
    audio_url: Optional[str] = None


class SpeakingSubmitIn(BaseModel):
    telegram_id: int
    part1_audio_url: Optional[str] = None
    part2_audio_url: Optional[str] = None
    part3_audio_url: Optional[str] = None
    finish_type: str = "manual"


class SpeakingCheckIn(BaseModel):
    telegram_id: int


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _resolve_test_for_mock(db: Session, mock_id: int) -> SpeakingTest:
    test = (
        db.query(SpeakingTest)
        .filter(SpeakingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Speaking test not found for this mock")
    return test


def _require_speaking_paid_access(db: Session, telegram_id: int, mock_id: int, progress: SpeakingProgress | None, is_admin: bool) -> None:
    if is_admin:
        return
    if progress and not progress.is_submitted:
        return
    require_paid_access_or_spend(
        db=db,
        telegram_id=telegram_id,
        content_type="separate_block",
        reference_id=f"speaking:{mock_id}",
        full_mock_reference_id=mock_id,
    )


def _deadline(progress: SpeakingProgress, test: SpeakingTest) -> datetime | None:
    if not progress.started_at:
        return None
    return _to_utc(progress.started_at) + timedelta(minutes=max(int(test.time_limit_minutes or 18), 1))


def _is_time_up(progress: SpeakingProgress, test: SpeakingTest, now: datetime | None = None) -> bool:
    ends_at = _deadline(progress, test)
    if not ends_at:
        return False
    current = _to_utc(now or _utcnow())
    return current >= ends_at


def _serialize_parts(db: Session, test_id: int):
    parts = (
        db.query(SpeakingPart)
        .filter(SpeakingPart.test_id == test_id)
        .order_by(SpeakingPart.part_number.asc(), SpeakingPart.order_index.asc())
        .all()
    )
    return [
        {
            "id": item.id,
            "part_number": item.part_number,
            "instruction": item.instruction,
            "question": item.question,
            "order_index": item.order_index,
        }
        for item in parts
    ]


def _serialize_progress(progress: SpeakingProgress | None):
    if not progress:
        return None
    return {
        "part1_audio_url": progress.part1_audio_url,
        "part2_audio_url": progress.part2_audio_url,
        "part3_audio_url": progress.part3_audio_url,
        "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
        "submitted_at": _to_utc(progress.submitted_at).isoformat() if progress.submitted_at else None,
        "is_submitted": bool(progress.is_submitted),
    }


def _apply_part_audio(progress: SpeakingProgress, part_number: int, audio_url: str | None):
    cleaned = str(audio_url or "").strip() or None
    if int(part_number) == 1:
        progress.part1_audio_url = cleaned
    elif int(part_number) == 2:
        progress.part2_audio_url = cleaned
    elif int(part_number) == 3:
        progress.part3_audio_url = cleaned
    else:
        raise HTTPException(status_code=422, detail="part_number must be 1, 2, or 3")


@router.post("/speaking-audio/upload")
async def upload_speaking_audio(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "webm"
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {"url": f"/media/{filename}"}


@router.post("/mock-tests/{mock_id}/speaking/start")
def start_speaking(mock_id: int, payload: SpeakingStartIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    is_admin = int(payload.telegram_id) in ADMIN_IDS
    now = _utcnow()

    progress = (
        db.query(SpeakingProgress)
        .filter(
            SpeakingProgress.test_id == test.id,
            SpeakingProgress.telegram_id == payload.telegram_id,
        )
        .first()
    )

    if progress and progress.is_submitted and not is_admin:
        existing_result = (
            db.query(SpeakingResult)
            .filter(SpeakingResult.progress_id == progress.id)
            .first()
        )
        return {
            "mock_id": mock_id,
            "test_id": test.id,
            "title": test.title,
            "time_limit_minutes": test.time_limit_minutes,
            "already_submitted": True,
            "timer": {
                "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
                "ends_at": _deadline(progress, test).isoformat() if _deadline(progress, test) else None,
                "duration_seconds": max(int(test.time_limit_minutes or 18), 1) * 60,
            },
            "parts": _serialize_parts(db, test.id),
            "progress": _serialize_progress(progress),
            "result": (
                {
                    "overall_band": float(existing_result.overall_band),
                    "criteria": {
                        "fluency_and_coherence": float(existing_result.fluency_band),
                        "lexical_resource": float(existing_result.lexical_band),
                        "grammatical_range_and_accuracy": float(existing_result.grammar_band),
                        "pronunciation": float(existing_result.pronunciation_band),
                    },
                }
                if existing_result
                else None
            ),
            "is_admin": bool(is_admin),
        }

    _require_speaking_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)

    if not progress:
        progress = SpeakingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            is_submitted=False,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    else:
        if is_admin and progress.is_submitted:
            progress.part1_audio_url = None
            progress.part2_audio_url = None
            progress.part3_audio_url = None
            progress.started_at = now
            progress.submitted_at = None
            progress.is_submitted = False
            db.add(progress)
            db.commit()
            db.refresh(progress)
        elif _is_time_up(progress, test, now):
            progress.is_submitted = True
            progress.submitted_at = _deadline(progress, test) or now
            db.add(progress)
            db.commit()
            db.refresh(progress)

    return {
        "mock_id": mock_id,
        "test_id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "already_submitted": bool(progress.is_submitted and not is_admin),
        "timer": {
            "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
            "ends_at": _deadline(progress, test).isoformat() if _deadline(progress, test) else None,
            "duration_seconds": max(int(test.time_limit_minutes or 18), 1) * 60,
        },
        "parts": _serialize_parts(db, test.id),
        "progress": _serialize_progress(progress),
        "is_admin": bool(is_admin),
    }


@router.post("/mock-tests/{mock_id}/speaking/save")
def save_speaking(mock_id: int, payload: SpeakingSaveIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    is_admin = int(payload.telegram_id) in ADMIN_IDS
    now = _utcnow()

    progress = (
        db.query(SpeakingProgress)
        .filter(
            SpeakingProgress.test_id == test.id,
            SpeakingProgress.telegram_id == payload.telegram_id,
        )
        .first()
    )

    if not progress:
        _require_speaking_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = SpeakingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            is_submitted=False,
        )

    if progress.is_submitted and not is_admin:
        return {"status": "already_submitted"}

    if progress.is_submitted and is_admin:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.started_at = now

    _apply_part_audio(progress, payload.part_number, payload.audio_url)

    if _is_time_up(progress, test, now):
        progress.is_submitted = True
        progress.submitted_at = _deadline(progress, test) or now
        db.add(progress)
        db.commit()
        return {"status": "auto_submitted"}

    db.add(progress)
    db.commit()
    return {"status": "saved"}


@router.post("/mock-tests/{mock_id}/speaking/submit")
def submit_speaking(mock_id: int, payload: SpeakingSubmitIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    is_admin = int(payload.telegram_id) in ADMIN_IDS
    now = _utcnow()

    progress = (
        db.query(SpeakingProgress)
        .filter(
            SpeakingProgress.test_id == test.id,
            SpeakingProgress.telegram_id == payload.telegram_id,
        )
        .first()
    )
    if not progress:
        _require_speaking_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = SpeakingProgress(
            test_id=test.id,
            telegram_id=payload.telegram_id,
            started_at=now,
            is_submitted=False,
        )

    if progress.is_submitted and not is_admin:
        return {"status": "already_submitted", "progress": _serialize_progress(progress)}

    if payload.part1_audio_url is not None:
        progress.part1_audio_url = str(payload.part1_audio_url or "").strip() or None
    if payload.part2_audio_url is not None:
        progress.part2_audio_url = str(payload.part2_audio_url or "").strip() or None
    if payload.part3_audio_url is not None:
        progress.part3_audio_url = str(payload.part3_audio_url or "").strip() or None

    progress.is_submitted = True
    if str(payload.finish_type or "").strip().lower() == "auto":
        progress.submitted_at = _deadline(progress, test) or now
    else:
        progress.submitted_at = now

    db.add(progress)
    db.commit()
    db.refresh(progress)
    return {"status": "submitted", "progress": _serialize_progress(progress)}


@router.post("/mock-tests/{mock_id}/speaking/check")
def check_speaking(mock_id: int, payload: SpeakingCheckIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    progress = (
        db.query(SpeakingProgress)
        .filter(
            SpeakingProgress.test_id == test.id,
            SpeakingProgress.telegram_id == payload.telegram_id,
        )
        .first()
    )
    if not progress:
        raise HTTPException(status_code=404, detail="Speaking progress not found")
    if not progress.is_submitted:
        raise HTTPException(status_code=422, detail="Speaking is not submitted yet")

    existing = (
        db.query(SpeakingResult)
        .filter(SpeakingResult.progress_id == progress.id)
        .first()
    )
    if existing:
        return {
            "overall_band": float(existing.overall_band),
            "criteria": {
                "fluency_and_coherence": float(existing.fluency_band),
                "lexical_resource": float(existing.lexical_band),
                "grammatical_range_and_accuracy": float(existing.grammar_band),
                "pronunciation": float(existing.pronunciation_band),
            },
        }

    result = check_speaking_progress(progress)

    db_result = SpeakingResult(
        progress_id=progress.id,
        overall_band=float(result["overall_band"]),
        fluency_band=float(result["criteria"]["fluency_and_coherence"]),
        lexical_band=float(result["criteria"]["lexical_resource"]),
        grammar_band=float(result["criteria"]["grammatical_range_and_accuracy"]),
        pronunciation_band=float(result["criteria"]["pronunciation"]),
        raw_json=result,
    )
    db.add(db_result)
    db.commit()

    return {
        "overall_band": float(result["overall_band"]),
        "criteria": {
            "fluency_and_coherence": float(result["criteria"]["fluency_and_coherence"]),
            "lexical_resource": float(result["criteria"]["lexical_resource"]),
            "grammatical_range_and_accuracy": float(result["criteria"]["grammatical_range_and_accuracy"]),
            "pronunciation": float(result["criteria"]["pronunciation"]),
        },
    }
