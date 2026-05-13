from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import ListeningBlock, ListeningQuestion, ListeningSection, ListeningTest
from app.services.vcoin_service import require_paid_access_or_spend

router = APIRouter(prefix="/mock-tests", tags=["listening"])


class ListeningStartIn(BaseModel):
    telegram_id: int


class ListeningSaveIn(BaseModel):
    telegram_id: int
    answers: Dict[str, Any] = Field(default_factory=dict)


class ListeningSubmitIn(ListeningSaveIn):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_test_for_mock(db: Session, mock_id: int) -> ListeningTest:
    test = db.query(ListeningTest).filter(ListeningTest.id == int(mock_id)).first()
    if not test:
        raise HTTPException(status_code=404, detail="Listening test not found for this mock")
    return test


def _require_listening_paid_access(db: Session, telegram_id: int, mock_id: int) -> None:
    if int(telegram_id) in ADMIN_IDS:
        return
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
        user_answer = answers.get(str(question.id))
        if isinstance(correct, list):
            correct_set = {_normalize_answer(item) for item in correct if _normalize_answer(item)}
            user_set = {_normalize_answer(item) for item in user_answer} if isinstance(user_answer, list) else {_normalize_answer(user_answer)}
            if correct_set and correct_set == user_set:
                score += 1
        elif _normalize_answer(correct) and _normalize_answer(correct) == _normalize_answer(user_answer):
            score += 1
    return {"score": score, "total": len(questions), "band": "0.0"}


@router.get("/{mock_id}/listening/start")
def start_listening(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    _require_listening_paid_access(db, telegram_id, mock_id)
    return _serialize_test(db, test)


@router.post("/{mock_id}/listening/save")
def save_listening(mock_id: int, payload: ListeningSaveIn, db: Session = Depends(get_db)):
    _resolve_test_for_mock(db, mock_id)
    _require_listening_paid_access(db, payload.telegram_id, mock_id)
    return {"status": "saved"}


@router.get("/{mock_id}/listening/resume")
def resume_listening(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    _resolve_test_for_mock(db, mock_id)
    _require_listening_paid_access(db, telegram_id, mock_id)
    return {"answers": {}, "is_submitted": False}


@router.post("/{mock_id}/listening/submit")
def submit_listening(mock_id: int, payload: ListeningSubmitIn, db: Session = Depends(get_db)):
    test = _resolve_test_for_mock(db, mock_id)
    _require_listening_paid_access(db, payload.telegram_id, mock_id)
    return _evaluate(db, test.id, payload.answers or {})
