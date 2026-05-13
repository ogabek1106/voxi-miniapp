# backend/app/api/mock_tests.py
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import ReadingPassage, ReadingProgress, ReadingQuestion, ReadingTest, User
from app.services.telegram_sub_gate import check_reading_access, check_channel_membership
from app.services.vcoin_service import require_paid_access_or_spend

router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])


class SubmitResultItem(BaseModel):
    question_id: int
    correct: bool


class SubmitResultOut(BaseModel):
    score: int
    total: int
    band: float
    details: List[SubmitResultItem]


class ReadingSubmitIn(BaseModel):
    telegram_id: int
    answers: Dict[str, dict] = Field(default_factory=dict)


class ReadingSaveIn(BaseModel):
    telegram_id: int
    answers: Dict[str, dict] = Field(default_factory=dict)

class ReadingEntryCheckIn(BaseModel):
    init_data: str = ""
    telegram_id: Optional[int] = None


def _get_test_for_mock(db: Session, mock_id: int) -> ReadingTest:
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.mock_pack_id == mock_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found for this mock")
    return test


def _get_user_by_telegram(db: Session, telegram_id: int) -> User:
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _is_admin_user(user: User) -> bool:
    return int(user.telegram_id) in ADMIN_IDS


def _require_reading_paid_access(db: Session, telegram_id: int, mock_id: int, progress: ReadingProgress | None, is_admin: bool) -> None:
    if is_admin:
        return
    if progress and not progress.is_submitted:
        return
    require_paid_access_or_spend(
        db=db,
        telegram_id=telegram_id,
        content_type="separate_block",
        reference_id=f"reading:{mock_id}",
        full_mock_reference_id=mock_id,
    )


def _extract_payload_value(raw: Any) -> Any:
    if isinstance(raw, dict):
        return raw.get("value")
    return raw


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_time_up(ends_at: datetime | None, now: datetime | None = None) -> bool:
    if not ends_at:
        return False
    current = _to_utc(now or _utcnow())
    deadline = _to_utc(ends_at)
    return current >= deadline

def _auto_submitted_at(ends_at: datetime | None, now: datetime | None = None) -> datetime:
    current = _to_utc(now or _utcnow())
    deadline = _to_utc(ends_at)
    if deadline is None:
        return current
    return deadline if deadline <= current else current


def _normalize_string(value: Any) -> str:
    return str(value if value is not None else "").strip().lower()

def _calculate_reading_band(score: int) -> float:
    if score >= 39:
        return 9.0
    if score >= 37:
        return 8.5
    if score >= 35:
        return 8.0
    if score >= 33:
        return 7.5
    if score >= 30:
        return 7.0
    if score >= 27:
        return 6.5
    if score >= 23:
        return 6.0
    if score >= 19:
        return 5.5
    if score >= 15:
        return 5.0
    if score >= 13:
        return 4.5
    if score >= 10:
        return 4.0
    if score >= 8:
        return 3.5
    if score >= 6:
        return 3.0
    if score >= 4:
        return 2.5
    return 0.0

def _is_correct_answer(question: ReadingQuestion, user_payload: Any) -> bool:
    correct_payload = _extract_payload_value(question.correct_answer)
    user_value = _extract_payload_value(user_payload)

    if isinstance(correct_payload, list):
        if not isinstance(user_value, list):
            return False
        left = {_normalize_string(item) for item in correct_payload if _normalize_string(item)}
        right = {_normalize_string(item) for item in user_value if _normalize_string(item)}
        return left == right and len(left) > 0

    return _normalize_string(user_value) == _normalize_string(correct_payload) and _normalize_string(correct_payload) != ""


def _evaluate_reading(questions: List[ReadingQuestion], answers: Dict[str, Any]) -> SubmitResultOut:
    score = 0
    details: List[SubmitResultItem] = []

    for question in questions:
        qid = str(question.id)
        is_correct = _is_correct_answer(question, answers.get(qid))
        if is_correct:
            score += 1
        details.append(SubmitResultItem(question_id=question.id, correct=is_correct))

    return SubmitResultOut(
        score=score,
        total=len(questions),
        band=_calculate_reading_band(score),
        details=details
    )


def _finalize_progress(progress: ReadingProgress, questions: List[ReadingQuestion], submitted_at: datetime) -> SubmitResultOut:
    result = _evaluate_reading(questions, progress.answers or {})
    progress.is_submitted = True
    progress.submitted_at = submitted_at
    progress.raw_score = result.score
    progress.max_score = result.total
    progress.band_score = result.band
    progress.updated_at = submitted_at
    return result


def _query_questions_for_test(db: Session, test_id: int) -> List[ReadingQuestion]:
    return (
        db.query(ReadingQuestion)
        .join(ReadingPassage, ReadingQuestion.passage_id == ReadingPassage.id)
        .filter(ReadingPassage.test_id == test_id)
        .order_by(ReadingPassage.order_index.asc(), ReadingQuestion.order_index.asc())
        .all()
    )


def _build_submitted_start_response(progress: ReadingProgress, result: SubmitResultOut, mock_id: int, test: ReadingTest) -> Dict[str, Any]:
    return {
        "already_submitted": True,
        "mock_id": mock_id,
        "test_id": test.id,
        "title": test.title,
        "result": {
            "score": result.score,
            "total": result.total,
            "band": result.band
        },
        "timer": {
            "started_at": progress.started_at.isoformat() if progress.started_at else None,
            "ends_at": progress.ends_at.isoformat() if progress.ends_at else None,
            "duration_seconds": max(int(test.time_limit_minutes or 60), 1) * 60
        },
        "passages": []
    }


@router.post("/{mock_id}/reading/entry-check")
def reading_entry_check(mock_id: int, payload: ReadingEntryCheckIn, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    access_result = check_reading_access(payload.init_data)

    if not access_result.get("ok"):
        # Fallback path: if init_data validation fails on some clients,
        # check membership directly by telegram_id.
        if payload.telegram_id and check_channel_membership(int(payload.telegram_id)):
            access_result = {
                "ok": True,
                "telegram_user_id": int(payload.telegram_id),
                "fallback": "telegram_id_membership"
            }
        else:
            return access_result

    return {
        "ok": True,
        "mock_id": mock_id,
        "test_id": test.id,
        "telegram_user_id": access_result.get("telegram_user_id"),
    }

@router.get("/{mock_id}/reading/start")
def start_reading_test(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, telegram_id)
    is_admin = _is_admin_user(user)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id)
        .first()
    )

    if progress and progress.is_submitted and not is_admin:
        questions = _query_questions_for_test(db, test.id)
        result = _evaluate_reading(questions, progress.answers or {})
        return _build_submitted_start_response(progress, result, mock_id, test)

    _require_reading_paid_access(db, telegram_id, mock_id, progress, is_admin)

    if not progress:
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            answers={},
            started_at=now,
            ends_at=now + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1)),    
            
            is_submitted=False
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    else:
        if is_admin:
            if progress.is_submitted:
                progress.answers = {}
                progress.started_at = now
                progress.ends_at = now + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1))    
                
                progress.is_submitted = False
                progress.submitted_at = None
                progress.raw_score = None
                progress.max_score = None
                progress.band_score = None
                progress.updated_at = now
                db.add(progress)
                db.commit()
                db.refresh(progress)
        else:
            if not progress.started_at:
                progress.started_at = now
            if not progress.ends_at:
                progress.ends_at = progress.started_at + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1))

            if _is_time_up(progress.ends_at, now):
                questions = _query_questions_for_test(db, test.id)
                result = _finalize_progress(progress, questions, _auto_submitted_at(progress.ends_at, now))
                db.add(progress)
                db.commit()
                db.refresh(progress)
                return _build_submitted_start_response(progress, result, mock_id, test)

            db.add(progress)
            db.commit()
            db.refresh(progress)

    passages = (
        db.query(ReadingPassage)
        .filter(ReadingPassage.test_id == test.id)
        .order_by(ReadingPassage.order_index.asc())
        .all()
    )

    result = []
    for passage in passages:
        questions = (
            db.query(ReadingQuestion)
            .filter(ReadingQuestion.passage_id == passage.id)
            .order_by(ReadingQuestion.order_index.asc())
            .all()
        )

        def public_meta(question: ReadingQuestion):
            meta = dict(question.meta or {})
            meta.pop("variants", None)
            return meta

        result.append({
            "id": passage.id,
            "title": passage.title,
            "text": passage.text,
            "image_url": passage.image_url,
            "questions": [
                {
                    "id": question.id,
                    "order_index": question.order_index,
                    "question_group_id": question.question_group_id,
                    "type": question.type.value if hasattr(question.type, "value") else str(question.type),
                    "instruction": question.instruction,
                    "content": question.content,
                    "meta": public_meta(question),
                    "points": question.points,
                    "image_url": question.image_url
                }
                for question in questions
            ]
        })

    duration_seconds = max(int(test.time_limit_minutes or 60), 1) * 60     
   

    return {
        "mock_id": mock_id,
        "test_id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "timer": {
            "started_at": progress.started_at.isoformat() if progress.started_at else None,
            "ends_at": progress.ends_at.isoformat() if progress.ends_at else None,
            "duration_seconds": duration_seconds
        },
        "passages": result
    }


@router.post("/{mock_id}/reading/submit", response_model=SubmitResultOut)
def submit_reading_test(mock_id: int, payload: ReadingSubmitIn, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, payload.telegram_id)
    is_admin = _is_admin_user(user)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id)
        .first()
    )

    if not progress:
        _require_reading_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            answers={},
            started_at=now,
            ends_at=now + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1)),
            is_submitted=False
        )

    if progress.is_submitted and not is_admin:
        questions = _query_questions_for_test(db, test.id)
        return _evaluate_reading(questions, progress.answers or {})

    if progress.is_submitted and is_admin:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.raw_score = None
        progress.max_score = None
        progress.band_score = None

    if payload.answers:
        progress.answers = payload.answers

    questions = _query_questions_for_test(db, test.id)
    result = _finalize_progress(progress, questions, now)
    db.add(progress)
    db.commit()

    return result


@router.post("/{mock_id}/reading/save")
def save_reading_progress(mock_id: int, payload: ReadingSaveIn, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, payload.telegram_id)
    is_admin = _is_admin_user(user)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id)
        .first()
    )

    if not progress:
        _require_reading_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            answers=payload.answers or {},
            started_at=now,
            ends_at=now + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1)),
            is_submitted=False
        )
        db.add(progress)
        db.commit()
        return {"status": "saved"}

    if progress.is_submitted and not is_admin:
        return {"status": "already_submitted"}

    if progress.is_submitted and is_admin:
        progress.is_submitted = False
        progress.submitted_at = None
        progress.raw_score = None
        progress.max_score = None
        progress.band_score = None
        progress.started_at = now
        progress.ends_at = now + timedelta(minutes=max(int(test.time_limit_minutes or 60), 1))

    if payload.answers:
        progress.answers = payload.answers

    if _is_time_up(progress.ends_at, now):
        questions = _query_questions_for_test(db, test.id)
        _finalize_progress(progress, questions, _auto_submitted_at(progress.ends_at, now))
        db.add(progress)
        db.commit()
        return {"status": "auto_submitted"}

    progress.updated_at = now
    db.add(progress)
    db.commit()

    return {"status": "saved"}


@router.get("/{mock_id}/reading/resume")
def resume_reading_progress(mock_id: int, telegram_id: int, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, telegram_id)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id)
        .first()
    )

    if not progress:
        return {
            "answers": {},
            "started_at": None,
            "updated_at": None,
            "ends_at": None,
            "is_submitted": False,
            "submitted_at": None,
            "raw_score": None,
            "max_score": None,
            "band_score": None
        }

    if not progress.is_submitted and _is_time_up(progress.ends_at, now):
        questions = _query_questions_for_test(db, test.id)
        _finalize_progress(progress, questions, _auto_submitted_at(progress.ends_at, now))
        db.add(progress)
        db.commit()
        db.refresh(progress)

    return {
        "answers": progress.answers or {},
        "started_at": progress.started_at,
        "updated_at": progress.updated_at,
        "ends_at": progress.ends_at,
        "is_submitted": progress.is_submitted,
        "submitted_at": progress.submitted_at,
        "raw_score": progress.raw_score,
        "max_score": progress.max_score,
        "band_score": float(progress.band_score) if progress.band_score is not None else None
    }
