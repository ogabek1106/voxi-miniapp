import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models import User, VocabularyOddOneOutAttempt, VocabularyPuzzleSet, VocabularyPuzzleWord


VALID_LEVELS = {"easy", "medium", "hard"}
VALID_CATEGORIES = {"meaning", "collocation", "grammar", "formality", "ielts", "other"}


def _clean_optional(value):
    value = str(value or "").strip()
    return value or None


def _validate_payload(payload):
    words = list(payload.words or [])
    if len(words) != 4:
        raise HTTPException(status_code=422, detail="exactly_4_words_required")
    if sum(1 for word in words if word.is_correct) != 1:
        raise HTTPException(status_code=422, detail="exactly_1_correct_word_required")
    if payload.level and payload.level not in VALID_LEVELS:
        raise HTTPException(status_code=422, detail="invalid_level")
    if payload.category and payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=422, detail="invalid_category")


def serialize_word(
    word: VocabularyPuzzleWord,
    include_correct: bool = True,
    include_image: bool = True,
) -> dict:
    data = {
        "id": word.id,
        "word_text": word.word_text,
        "order_index": word.order_index,
    }
    if include_image:
        data["image_url"] = word.image_url
    if include_correct:
        data["is_correct"] = bool(word.is_correct)
    return data


def serialize_set(
    puzzle_set: VocabularyPuzzleSet,
    include_correct: bool = True,
    include_image: bool = True,
) -> dict:
    return {
        "id": puzzle_set.id,
        "title": puzzle_set.title,
        "level": puzzle_set.level,
        "category": puzzle_set.category,
        "explanation": puzzle_set.explanation,
        "status": puzzle_set.status,
        "created_at": puzzle_set.created_at.isoformat() if puzzle_set.created_at else None,
        "updated_at": puzzle_set.updated_at.isoformat() if puzzle_set.updated_at else None,
        "words": [
            serialize_word(word, include_correct=include_correct, include_image=include_image)
            for word in puzzle_set.words
        ],
    }


def list_sets(db: Session) -> list[VocabularyPuzzleSet]:
    return (
        db.query(VocabularyPuzzleSet)
        .options(joinedload(VocabularyPuzzleSet.words))
        .order_by(VocabularyPuzzleSet.id.desc())
        .all()
    )


def get_set(db: Session, set_id: int) -> VocabularyPuzzleSet | None:
    return (
        db.query(VocabularyPuzzleSet)
        .options(joinedload(VocabularyPuzzleSet.words))
        .filter(VocabularyPuzzleSet.id == set_id)
        .first()
    )


def create_set(db: Session, payload) -> VocabularyPuzzleSet:
    _validate_payload(payload)
    puzzle_set = VocabularyPuzzleSet(
        title=_clean_optional(payload.title),
        level=_clean_optional(payload.level),
        category=_clean_optional(payload.category),
        explanation=_clean_optional(payload.explanation),
        status=payload.status or "draft",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(puzzle_set)
    db.flush()
    _replace_words(db, puzzle_set, payload.words)
    db.commit()
    db.refresh(puzzle_set)
    return get_set(db, puzzle_set.id)


def update_set(db: Session, set_id: int, payload) -> VocabularyPuzzleSet | None:
    _validate_payload(payload)
    puzzle_set = get_set(db, set_id)
    if not puzzle_set:
        return None
    puzzle_set.title = _clean_optional(payload.title)
    puzzle_set.level = _clean_optional(payload.level)
    puzzle_set.category = _clean_optional(payload.category)
    puzzle_set.explanation = _clean_optional(payload.explanation)
    puzzle_set.status = payload.status or puzzle_set.status or "draft"
    puzzle_set.updated_at = datetime.utcnow()
    _replace_words(db, puzzle_set, payload.words)
    db.commit()
    return get_set(db, set_id)


def _replace_words(db: Session, puzzle_set: VocabularyPuzzleSet, words):
    for existing in list(puzzle_set.words or []):
        db.delete(existing)
    db.flush()
    for index, word in enumerate(words):
        db.add(VocabularyPuzzleWord(
            set_id=puzzle_set.id,
            word_text=word.word_text,
            image_url=_clean_optional(word.image_url),
            order_index=index,
            is_correct=bool(word.is_correct),
        ))


def delete_set(db: Session, set_id: int) -> bool:
    puzzle_set = get_set(db, set_id)
    if not puzzle_set:
        return False
    db.delete(puzzle_set)
    db.commit()
    return True


def set_status(db: Session, set_id: int, status: str) -> VocabularyPuzzleSet | None:
    puzzle_set = get_set(db, set_id)
    if not puzzle_set:
        return None
    puzzle_set.status = status
    puzzle_set.updated_at = datetime.utcnow()
    db.commit()
    return get_set(db, set_id)


def build_session(db: Session) -> list[dict]:
    sets = (
        db.query(VocabularyPuzzleSet)
        .options(joinedload(VocabularyPuzzleSet.words))
        .filter(VocabularyPuzzleSet.status == "published")
        .all()
    )
    random.shuffle(sets)
    result = []
    for puzzle_set in sets:
        words = list(puzzle_set.words or [])
        if len(words) != 4 or sum(1 for word in words if word.is_correct) != 1:
            continue
        random.shuffle(words)
        result.append({
            "id": puzzle_set.id,
            "title": puzzle_set.title,
            "level": puzzle_set.level,
            "category": puzzle_set.category,
            "words": [
                serialize_word(word, include_correct=False, include_image=False)
                for word in words
            ],
        })
    return result


def check_answer(db: Session, set_id: int, selected_word_id: int | None, timed_out: bool = False) -> dict:
    puzzle_set = get_set(db, set_id)
    if not puzzle_set or puzzle_set.status != "published":
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    correct_word = next((word for word in puzzle_set.words if word.is_correct), None)
    if not correct_word:
        raise HTTPException(status_code=422, detail="puzzle_has_no_correct_word")
    selected_exists = any(word.id == selected_word_id for word in puzzle_set.words)
    if not timed_out and not selected_exists:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_word_not_found")
    return {
        "correct": False if timed_out else int(correct_word.id) == int(selected_word_id),
        "correct_word_id": correct_word.id,
        "explanation": puzzle_set.explanation,
        "timed_out": bool(timed_out),
        "word_images": [
            {
                "id": word.id,
                "image_url": word.image_url,
            }
            for word in puzzle_set.words
        ],
    }


def record_attempt(db: Session, payload) -> VocabularyOddOneOutAttempt:
    total_sets = max(0, int(payload.total_sets_played or 0))
    correct = max(0, int(payload.correct_answers or 0))
    wrong = max(0, int(payload.wrong_answers or 0))
    timeouts = max(0, int(payload.timeouts or 0))
    attempt = None
    if payload.attempt_id:
        attempt = (
            db.query(VocabularyOddOneOutAttempt)
            .filter(VocabularyOddOneOutAttempt.id == int(payload.attempt_id))
            .first()
        )
    if not attempt:
        attempt = VocabularyOddOneOutAttempt()
        db.add(attempt)
    attempt.user_id = payload.user_id
    attempt.telegram_id = payload.telegram_id
    attempt.total_sets_played = total_sets
    attempt.correct_answers = correct
    attempt.wrong_answers = wrong
    attempt.timeouts = timeouts
    attempt.best_streak = max(0, int(payload.best_streak or 0))
    attempt.average_answer_time = payload.average_answer_time
    attempt.total_time_seconds = max(0, int(payload.total_time_seconds or 0))
    attempt.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(attempt)
    return attempt


def _user_name(user: User | None, attempt: VocabularyOddOneOutAttempt) -> str | None:
    if not user:
        return str(attempt.telegram_id) if attempt.telegram_id else None
    full_name = " ".join(part for part in [user.name, user.surname] if part)
    return full_name or user.email or (str(user.telegram_id) if user.telegram_id else None)


def _login_method(user: User | None, attempt: VocabularyOddOneOutAttempt) -> str | None:
    if user:
        if user.google_id:
            return "Google"
        if user.email and user.password_hash:
            return "Email"
        if user.telegram_id:
            return "Telegram"
    if attempt.telegram_id:
        return "Telegram"
    return None


def list_admin_stats(db: Session) -> dict:
    attempts = (
        db.query(VocabularyOddOneOutAttempt, User)
        .outerjoin(
            User,
            or_(
                VocabularyOddOneOutAttempt.user_id == User.id,
                VocabularyOddOneOutAttempt.telegram_id == User.telegram_id,
            )
        )
        .order_by(VocabularyOddOneOutAttempt.completed_at.desc())
        .all()
    )
    attempt_rows = [row[0] for row in attempts]
    total_attempts = len(attempt_rows)
    unique_keys = {
        attempt.user_id or attempt.telegram_id
        for attempt in attempt_rows
        if attempt.user_id or attempt.telegram_id
    }
    total_sets = sum(int(attempt.total_sets_played or 0) for attempt in attempt_rows)
    total_correct = sum(int(attempt.correct_answers or 0) for attempt in attempt_rows)
    total_time = sum(int(attempt.total_time_seconds or 0) for attempt in attempt_rows)
    total_timeouts = sum(int(attempt.timeouts or 0) for attempt in attempt_rows)
    weighted_answer_time_total = sum(
        float(attempt.average_answer_time or 0) * int(attempt.total_sets_played or 0)
        for attempt in attempt_rows
    )
    summary = {
        "total_attempts": total_attempts,
        "unique_users": len(unique_keys),
        "average_accuracy": (total_correct / total_sets * 100) if total_sets else 0,
        "average_answer_time": (weighted_answer_time_total / total_sets) if total_sets else 0,
        "total_time_seconds": total_time,
        "highest_streak": max([int(attempt.best_streak or 0) for attempt in attempt_rows] or [0]),
        "total_timeouts": total_timeouts,
    }
    items = []
    for attempt, user in attempts:
        sets_played = int(attempt.total_sets_played or 0)
        correct = int(attempt.correct_answers or 0)
        wrong = int(attempt.wrong_answers or 0)
        items.append({
            "attempt_id": attempt.id,
            "telegram_id": attempt.telegram_id,
            "user_name": _user_name(user, attempt),
            "login_method": _login_method(user, attempt),
            "total_sets_played": sets_played,
            "correct_answers": correct,
            "wrong_answers": wrong,
            "timeouts": int(attempt.timeouts or 0),
            "accuracy": (correct / sets_played * 100) if sets_played else 0,
            "best_streak": int(attempt.best_streak or 0),
            "average_answer_time": float(attempt.average_answer_time or 0),
            "total_time_seconds": int(attempt.total_time_seconds or 0),
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        })
    return {"summary": summary, "items": items}
