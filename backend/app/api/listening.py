from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import ListeningBlock, ListeningProgress, ListeningQuestion, ListeningSection, ListeningTest
from app.services.premiere_service import has_active_premiere_access, is_active_premiere_pack
from app.services.vcoin_service import require_paid_access_or_spend

router = APIRouter(prefix="/mock-tests", tags=["listening"])


class ListeningStartIn(BaseModel):
    telegram_id: int


class ListeningSaveIn(BaseModel):
    telegram_id: int
    session_mode: str = "single_block"
    answers: Dict[str, Any] = Field(default_factory=dict)


class ListeningSubmitIn(ListeningSaveIn):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _session_mode(value: str | None) -> str:
    return "full_mock" if str(value or "").strip().lower() == "full_mock" else "single_block"


def _resolve_test_for_mock(db: Session, mock_id: int) -> ListeningTest:
    test = db.query(ListeningTest).filter(ListeningTest.id == int(mock_id)).first()
    if not test:
        raise HTTPException(status_code=404, detail="Listening test not found for this mock")
    return test


def _require_listening_paid_access(db: Session, telegram_id: int, mock_id: int, progress: ListeningProgress | None = None) -> None:
    if int(telegram_id) in ADMIN_IDS:
        return
    if progress and not progress.is_submitted:
        return
    if has_active_premiere_access(db, telegram_id, mock_id):
        return
    if is_active_premiere_pack(db, mock_id):
        raise HTTPException(status_code=402, detail="premiere_access_required")
    require_paid_access_or_spend(
        db=db,
        telegram_id=telegram_id,
        content_type="separate_block",
        reference_id=f"listening:{mock_id}",
        full_mock_reference_id=mock_id,
    )


def _serialize_test(db: Session, test: ListeningTest) -> dict:
    sections = (
        db.query(ListeningSection)
        .filter(ListeningSection.test_id == test.id)
        .order_by(ListeningSection.order_index.asc(), ListeningSection.id.asc())
        .all()
    )

    output_sections = []
    for section in sections:
        blocks = (
            db.query(ListeningBlock)
            .filter(ListeningBlock.section_id == section.id)
            .order_by(ListeningBlock.order_index.asc(), ListeningBlock.id.asc())
            .all()
        )
        out_blocks = []
        for block in blocks:
            questions = (
                db.query(ListeningQuestion)
                .filter(ListeningQuestion.block_id == block.id)
                .order_by(ListeningQuestion.order_index.asc(), ListeningQuestion.id.asc())
                .all()
            )
            out_blocks.append({
                "id": block.id,
                "order_index": block.order_index,
                "block_type": block.block_type,
                "title": block.title,
                "instruction": block.instruction,
                "image_url": block.image_url,
                "start_time_seconds": block.start_time_seconds,
                "end_time_seconds": block.end_time_seconds,
                "meta": block.meta or {},
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "question_number": q.question_number,
                        "type": q.type,
                        "content": q.content,
                        "meta": q.meta or {},
                    }
                    for q in questions
                ],
            })

        output_sections.append({
            "id": section.id,
            "order_index": section.order_index,
            "section_number": section.section_number,
            "instructions": section.instructions,
            "audio_url": section.audio_url,
            "audio_name": section.audio_name,
            "global_instruction_after": section.global_instruction_after,
            "global_instruction_after_audio_url": section.global_instruction_after_audio_url,
            "global_instruction_after_audio_name": section.global_instruction_after_audio_name,
            "blocks": out_blocks,
        })

    started_at = _utcnow()
    return {
        "id": test.id,
        "mock_id": test.id,
        "title": test.title or "Listening Test",
        "audio_url": test.audio_url,
        "global_instruction_intro": test.global_instruction_intro or "",
        "global_instruction_intro_audio_url": test.global_instruction_intro_audio_url,
        "global_instruction_intro_audio_name": test.global_instruction_intro_audio_name,
        "time_limit_minutes": test.time_limit_minutes or 60,
        "timer": {
            "started_at": started_at.isoformat(),
            "ends_at": None,
            "duration_seconds": max(int(test.time_limit_minutes or 60), 1) * 60,
        },
        "sections": output_sections,
    }


def _normalize_answer(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("value")
    return str(value if value is not None else "").strip().lower()


def _answer_value(value: Any) -> Any:
    if isinstance(value, dict):
        return value.get("value")
    return value


def _calculate_listening_band(score: int) -> float:
    if score >= 39:
        return 9.0
    if score >= 37:
        return 8.5
    if score >= 35:
        return 8.0
    if score >= 32:
        return 7.5
    if score >= 30:
        return 7.0
    if score >= 26:
        return 6.5
    if score >= 23:
        return 6.0
    if score >= 18:
        return 5.5
    if score >= 16:
        return 5.0
    if score >= 13:
        return 4.5
    if score >= 11:
        return 4.0
    return 0.0


def _get_progress(db: Session, test_id: int, telegram_id: int, session_mode: str) -> ListeningProgress | None:
    return (
        db.query(ListeningProgress)
        .filter(
            ListeningProgress.telegram_id == int(telegram_id),
            ListeningProgress.test_id == int(test_id),
            ListeningProgress.session_mode == _session_mode(session_mode),
        )
        .order_by(ListeningProgress.id.desc())
        .first()
    )


def _evaluate(db: Session, test_id: int, answers: Dict[str, Any]) -> dict:
    questions = (
        db.query(ListeningQuestion)
        .join(ListeningBlock, ListeningQuestion.block_id == ListeningBlock.id)
        .join(ListeningSection, ListeningBlock.section_id == ListeningSection.id)
        .filter(ListeningSection.test_id == test_id)
        .order_by(ListeningSection.order_index.asc(), ListeningBlock.order_index.asc(), ListeningQuestion.order_index.asc())
        .all()
    )
    score = 0
    for question in questions:
        correct = question.correct_answer
        user_answer = _answer_value(answers.get(str(question.id)))
        if isinstance(correct, list):
            correct_set = {_normalize_answer(item) for item in correct if _normalize_answer(item)}
            user_set = {_normalize_answer(item) for item in user_answer} if isinstance(user_answer, list) else {_normalize_answer(user_answer)}
            if correct_set and correct_set == user_set:
                score += 1
        elif _normalize_answer(correct) and _normalize_answer(correct) == _normalize_answer(user_answer):
            score += 1
    return {"score": score, "total": len(questions), "band": _calculate_listening_band(score)}


@router.get("/{mock_id}/listening/start")
def start_listening(
    mock_id: int,
    telegram_id: int,
    session_mode: str = "single_block",
    retake: bool = False,
    retake_payment_reference_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    test = _resolve_test_for_mock(db, mock_id)
    mode = _session_mode(session_mode)
    progress = _get_progress(db, test.id, telegram_id, mode)
    is_admin = int(telegram_id) in ADMIN_IDS

    if progress and progress.is_submitted and (is_admin or retake):
        if retake and not is_admin:
            require_paid_access_or_spend(
                db=db,
                telegram_id=telegram_id,
                content_type="full_mock" if mode == "full_mock" else "separate_block",
                reference_id=retake_payment_reference_id or f"{mode}:listening:{mock_id}:retake",
            )
        progress.answers = {}
        progress.started_at = _utcnow()
        progress.updated_at = progress.started_at
        progress.submitted_at = None
        progress.is_submitted = False
        progress.raw_score = None
        progress.max_score = None
        progress.band_score = None
        db.add(progress)
        db.commit()

    _require_listening_paid_access(db, telegram_id, mock_id, progress)
    return _serialize_test(db, test)


@router.post("/{mock_id}/listening/save")
def save_listening(mock_id: int, payload: ListeningSaveIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    now = _utcnow()
    mode = _session_mode(payload.session_mode)
    progress = _get_progress(db, test.id, payload.telegram_id, mode)
    _require_listening_paid_access(db, payload.telegram_id, mock_id, progress)

    if not progress:
        progress = ListeningProgress(
            test_id=test.id,
            telegram_id=int(payload.telegram_id),
            session_mode=mode,
            answers=payload.answers or {},
            started_at=now,
            updated_at=now,
            is_submitted=False,
        )
        db.add(progress)
        db.commit()
        return {"status": "saved"}

    if progress.is_submitted and int(payload.telegram_id) not in ADMIN_IDS:
        return {"status": "already_submitted"}

    if progress.is_submitted and int(payload.telegram_id) in ADMIN_IDS:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.raw_score = None
        progress.max_score = None
        progress.band_score = None
        progress.started_at = now

    progress.answers = payload.answers or {}
    progress.updated_at = now
    db.add(progress)
    db.commit()
    return {"status": "saved"}


@router.get("/{mock_id}/listening/resume")
def resume_listening(mock_id: int, telegram_id: int, session_mode: str = "single_block", db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    progress = _get_progress(db, test.id, telegram_id, session_mode)
    _require_listening_paid_access(db, telegram_id, mock_id, progress)
    if not progress:
        return {"answers": {}, "is_submitted": False}
    return {
        "answers": progress.answers or {},
        "started_at": progress.started_at,
        "updated_at": progress.updated_at,
        "submitted_at": progress.submitted_at,
        "is_submitted": bool(progress.is_submitted),
        "raw_score": progress.raw_score,
        "max_score": progress.max_score,
        "band_score": float(progress.band_score) if progress.band_score is not None else None,
    }


@router.post("/{mock_id}/listening/submit")
def submit_listening(mock_id: int, payload: ListeningSubmitIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    now = _utcnow()
    mode = _session_mode(payload.session_mode)
    progress = _get_progress(db, test.id, payload.telegram_id, mode)
    _require_listening_paid_access(db, payload.telegram_id, mock_id, progress)

    if not progress:
        progress = ListeningProgress(
            test_id=test.id,
            telegram_id=int(payload.telegram_id),
            session_mode=mode,
            answers={},
            started_at=now,
            is_submitted=False,
        )

    if progress.is_submitted and int(payload.telegram_id) not in ADMIN_IDS:
        return {
            "score": int(progress.raw_score or 0),
            "total": int(progress.max_score or 0),
            "band": float(progress.band_score or 0),
        }

    if payload.answers:
        progress.answers = payload.answers

    result = _evaluate(db, test.id, progress.answers or {})
    progress.raw_score = int(result["score"])
    progress.max_score = int(result["total"])
    progress.band_score = float(result["band"])
    progress.is_submitted = True
    progress.submitted_at = now
    progress.updated_at = now
    db.add(progress)
    db.commit()
    db.refresh(progress)
    from app.services import xp_service
    xp_service.award_listening_completion(db, progress)

    return result
