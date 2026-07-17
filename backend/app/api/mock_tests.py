# backend/app/api/mock_tests.py
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import traceback

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import MockPack, ReadingPassage, ReadingProgress, ReadingQuestion, ReadingTest, User
from app.services.telegram_sub_gate import check_reading_access, check_channel_membership
from app.services.premiere_service import has_active_premiere_access, is_active_premiere_pack
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
    session_mode: str = "single_block"
    answers: Dict[str, dict] = Field(default_factory=dict)


class ReadingSaveIn(BaseModel):
    telegram_id: int
    session_mode: str = "single_block"
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
    if int(telegram_id) < 0:
        user = db.query(User).filter(User.id == abs(int(telegram_id))).first()
        if user:
            return user
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _session_mode(value: str | None) -> str:
    return "full_mock" if str(value or "").strip().lower() == "full_mock" else "single_block"


def _is_admin_user(user: User) -> bool:
    return bool(user.telegram_id and int(user.telegram_id) in ADMIN_IDS)


def _require_reading_paid_access(db: Session, telegram_id: int, mock_id: int, progress: ReadingProgress | None, is_admin: bool) -> None:
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
        reference_id=f"reading:{mock_id}",
        full_mock_reference_id=mock_id,
    )


def _require_reading_entry_access(db: Session, telegram_id: int, mock_id: int, progress: ReadingProgress | None, is_admin: bool, mode: str) -> None:
    if progress and not progress.is_submitted:
        return
    if has_active_premiere_access(db, telegram_id, mock_id):
        return
    if is_active_premiere_pack(db, mock_id):
        raise HTTPException(status_code=402, detail="premiere_access_required")
    if mode == "full_mock":
        require_paid_access_or_spend(
            db=db,
            telegram_id=telegram_id,
            content_type="full_mock",
            reference_id=mock_id,
        )
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


def _award_reading_xp(db: Session, progress: ReadingProgress) -> None:
    from app.services import xp_service
    xp_service.award_reading_completion(db, progress)


def _query_questions_for_test(db: Session, test_id: int) -> List[ReadingQuestion]:
    return (
        db.query(ReadingQuestion)
        .join(ReadingPassage, ReadingQuestion.passage_id == ReadingPassage.id)
        .filter(ReadingPassage.test_id == test_id)
        .order_by(ReadingPassage.order_index.asc(), ReadingQuestion.order_index.asc())
        .all()
    )


def _public_question_meta(raw_meta: Any) -> Dict[str, Any]:
    if isinstance(raw_meta, dict):
        meta = dict(raw_meta)
    else:
        meta = {}
    meta.pop("variants", None)
    return meta


def _reading_start_debug(message: str, payload: Optional[Dict[str, Any]] = None) -> None:
    if payload is None:
        print(f"[READING_START_DEBUG] {message}", flush=True)
        return
    print(f"[READING_START_DEBUG] {message}: {payload}", flush=True)


def _debug_datetime(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


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
def start_reading_test(
    request: Request,
    mock_id: int,
    telegram_id: int,
    session_mode: str = "single_block",
    retake: bool = False,
    retake_payment_reference_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    last_step = "entered"
    try:
        now = _utcnow()
        _reading_start_debug("ENTER", {
            "mock_id": mock_id,
            "telegram_id": telegram_id,
            "session_mode": session_mode,
            "retake": retake,
            "path": request.url.path,
            "query": request.url.query,
            "server_time": now.isoformat(),
        })

        last_step = "mock_pack_lookup"
        mock_pack = db.query(MockPack).filter(MockPack.id == mock_id).first()
        _reading_start_debug("MOCK_PACK", {
            "exists": bool(mock_pack),
            "id": mock_pack.id if mock_pack else None,
            "title": mock_pack.title if mock_pack else None,
            "status": mock_pack.status.value if mock_pack and hasattr(mock_pack.status, "value") else str(mock_pack.status) if mock_pack else None,
            "premiere_is_active": mock_pack.premiere_is_active if mock_pack else None,
            "premiere_ends_at": _debug_datetime(mock_pack.premiere_ends_at) if mock_pack else None,
            "premiere_price_uzs": mock_pack.premiere_price_uzs if mock_pack else None,
        })

        last_step = "reading_test_lookup"
        debug_test = (
            db.query(ReadingTest)
            .filter(ReadingTest.mock_pack_id == mock_id)
            .first()
        )
        _reading_start_debug("READING_TEST_LOOKUP", {
            "mock_id": mock_id,
            "found": bool(debug_test),
            "selected_reading_test_id": debug_test.id if debug_test else None,
            "title": debug_test.title if debug_test else None,
            "status": debug_test.status.value if debug_test and hasattr(debug_test.status, "value") else str(debug_test.status) if debug_test else None,
            "mock_pack_id": debug_test.mock_pack_id if debug_test else None,
            "time_limit_minutes": debug_test.time_limit_minutes if debug_test else None,
        })
        test = _get_test_for_mock(db, mock_id)

        last_step = "user_lookup"
        user = _get_user_by_telegram(db, telegram_id)
        is_admin = _is_admin_user(user)
        _reading_start_debug("USER", {
            "exists": bool(user),
            "user_id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "is_admin": is_admin,
        })

        mode = _session_mode(session_mode)
        last_step = "progress_lookup"
        progress = (
            db.query(ReadingProgress)
            .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id, ReadingProgress.session_mode == mode)
            .order_by(ReadingProgress.id.desc())
            .first()
        )
        _reading_start_debug("PROGRESS", {
            "mode": mode,
            "exists": bool(progress),
            "progress_id": progress.id if progress else None,
            "is_submitted": progress.is_submitted if progress else None,
            "started_at": _debug_datetime(progress.started_at) if progress else None,
            "ends_at": _debug_datetime(progress.ends_at) if progress else None,
            "submitted_at": _debug_datetime(progress.submitted_at) if progress else None,
            "session_mode": progress.session_mode if progress else None,
        })

        if (retake or is_admin) and progress and progress.is_submitted:
            last_step = "retake_payment"
            _reading_start_debug("DECISION", {
                "action": "retake_payment_then_new_progress",
                "content_type": "full_mock" if mode == "full_mock" else "separate_block",
                "reference_id": retake_payment_reference_id or f"{mode}:reading:{mock_id}:retake",
            })
            require_paid_access_or_spend(
                db=db,
                telegram_id=telegram_id,
                content_type="full_mock" if mode == "full_mock" else "separate_block",
                reference_id=retake_payment_reference_id or f"{mode}:reading:{mock_id}:retake",
            )
            progress = None

        if progress and progress.is_submitted and not is_admin:
            last_step = "already_submitted_response"
            _reading_start_debug("DECISION", {
                "action": "return_already_submitted",
                "progress_id": progress.id,
            })
            questions = _query_questions_for_test(db, test.id)
            result = _evaluate_reading(questions, progress.answers or {})
            response = _build_submitted_start_response(progress, result, mock_id, test)
            _reading_start_debug("RESPONSE_KEYS", {"keys": list(response.keys())})
            return response

        last_step = "access_check"
        _reading_start_debug("ACCESS_CHECK", {
            "mode": mode,
            "is_admin": is_admin,
            "has_active_progress": bool(progress and not progress.is_submitted),
        })
        _require_reading_entry_access(db, telegram_id, mock_id, progress, is_admin, mode)

        duration_minutes = max(int(test.time_limit_minutes or 60), 1)
        if not progress:
            last_step = "create_progress"
            calculated_ends_at = now + timedelta(minutes=duration_minutes)
            _reading_start_debug("DECISION", {
                "action": "create_new_progress",
                "duration_minutes": duration_minutes,
                "started_at": now.isoformat(),
                "ends_at": calculated_ends_at.isoformat(),
                "reason": "no_existing_progress",
            })
            progress = ReadingProgress(
                user_id=user.id,
                test_id=test.id,
                session_mode=mode,
                answers={},
                started_at=now,
                ends_at=calculated_ends_at,
                is_submitted=False
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)
        else:
            last_step = "resume_progress"
            _reading_start_debug("DECISION", {
                "action": "resume_existing_progress",
                "progress_id": progress.id,
                "duration_minutes": duration_minutes,
                "reason": "existing_progress",
            })
            if not is_admin:
                if not progress.started_at:
                    progress.started_at = now
                    _reading_start_debug("PROGRESS_UPDATE", {"field": "started_at", "value": now.isoformat()})
                if not progress.ends_at:
                    progress.ends_at = progress.started_at + timedelta(minutes=duration_minutes)
                    _reading_start_debug("PROGRESS_UPDATE", {"field": "ends_at", "value": progress.ends_at.isoformat()})

                if _is_time_up(progress.ends_at, now):
                    last_step = "auto_finalize_time_up"
                    _reading_start_debug("DECISION", {
                        "action": "auto_finalize_time_up",
                        "progress_id": progress.id,
                        "ends_at": _debug_datetime(progress.ends_at),
                        "now": now.isoformat(),
                    })
                    questions = _query_questions_for_test(db, test.id)
                    result = _finalize_progress(progress, questions, _auto_submitted_at(progress.ends_at, now))
                    db.add(progress)
                    db.commit()
                    db.refresh(progress)
                    _award_reading_xp(db, progress)
                    response = _build_submitted_start_response(progress, result, mock_id, test)
                    _reading_start_debug("RESPONSE_KEYS", {"keys": list(response.keys())})
                    return response

                db.add(progress)
                db.commit()
                db.refresh(progress)

        last_step = "passage_query"
        passages = (
            db.query(ReadingPassage)
            .filter(ReadingPassage.test_id == test.id)
            .order_by(ReadingPassage.order_index.asc())
            .all()
        )
        _reading_start_debug("PASSAGES", {
            "count": len(passages),
            "ids": [passage.id for passage in passages],
            "empty": len(passages) == 0,
        })

        result = []
        total_questions = 0
        for passage in passages:
            last_step = f"questions_query_passage_{passage.id}"
            questions = (
                db.query(ReadingQuestion)
                .filter(ReadingQuestion.passage_id == passage.id)
                .order_by(ReadingQuestion.order_index.asc())
                .all()
            )
            total_questions += len(questions)
            _reading_start_debug("QUESTIONS", {
                "passage_id": passage.id,
                "passage_title": passage.title,
                "question_count": len(questions),
                "empty": len(questions) == 0,
            })

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
                        "meta": _public_question_meta(question.meta),
                        "points": question.points,
                        "image_url": question.image_url
                    }
                    for question in questions
                ]
            })

        duration_seconds = duration_minutes * 60
        response = {
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
        _reading_start_debug("PAYLOAD_READY", {
            "passage_count": len(result),
            "question_count": total_questions,
            "response_keys": list(response.keys()),
            "timer_keys": list(response["timer"].keys()),
        })
        return response
    except Exception as exc:
        _reading_start_debug("FAILED", {
            "last_step": last_step,
            "error_type": type(exc).__name__,
            "error": str(exc),
        })
        traceback.print_exc()
        raise


@router.post("/{mock_id}/reading/submit", response_model=SubmitResultOut)
def submit_reading_test(mock_id: int, payload: ReadingSubmitIn, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, payload.telegram_id)
    is_admin = _is_admin_user(user)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id, ReadingProgress.session_mode == _session_mode(payload.session_mode))
        .order_by(ReadingProgress.id.desc())
        .first()
    )

    if not progress:
        _require_reading_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            session_mode=_session_mode(payload.session_mode),
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
    db.refresh(progress)
    _award_reading_xp(db, progress)

    return result


@router.post("/{mock_id}/reading/save")
def save_reading_progress(mock_id: int, payload: ReadingSaveIn, db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, payload.telegram_id)
    is_admin = _is_admin_user(user)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id, ReadingProgress.session_mode == _session_mode(payload.session_mode))
        .order_by(ReadingProgress.id.desc())
        .first()
    )

    if not progress:
        _require_reading_paid_access(db, payload.telegram_id, mock_id, progress, is_admin)
        progress = ReadingProgress(
            user_id=user.id,
            test_id=test.id,
            session_mode=_session_mode(payload.session_mode),
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
        db.refresh(progress)
        _award_reading_xp(db, progress)
        return {"status": "auto_submitted"}

    progress.updated_at = now
    db.add(progress)
    db.commit()

    return {"status": "saved"}


@router.get("/{mock_id}/reading/resume")
def resume_reading_progress(mock_id: int, telegram_id: int, session_mode: str = "single_block", db: Session = Depends(get_db)):
    test = _get_test_for_mock(db, mock_id)
    user = _get_user_by_telegram(db, telegram_id)
    now = _utcnow()

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id, ReadingProgress.session_mode == _session_mode(session_mode))
        .order_by(ReadingProgress.id.desc())
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
        _award_reading_xp(db, progress)

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
