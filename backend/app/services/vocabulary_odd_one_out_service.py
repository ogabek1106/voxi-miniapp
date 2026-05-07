import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import VocabularyPuzzleSet, VocabularyPuzzleWord


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


def serialize_word(word: VocabularyPuzzleWord, include_correct: bool = True) -> dict:
    data = {
        "id": word.id,
        "word_text": word.word_text,
        "order_index": word.order_index,
    }
    if include_correct:
        data["is_correct"] = bool(word.is_correct)
    return data


def serialize_set(puzzle_set: VocabularyPuzzleSet, include_correct: bool = True) -> dict:
    return {
        "id": puzzle_set.id,
        "title": puzzle_set.title,
        "level": puzzle_set.level,
        "category": puzzle_set.category,
        "explanation": puzzle_set.explanation,
        "status": puzzle_set.status,
        "created_at": puzzle_set.created_at.isoformat() if puzzle_set.created_at else None,
        "updated_at": puzzle_set.updated_at.isoformat() if puzzle_set.updated_at else None,
        "words": [serialize_word(word, include_correct=include_correct) for word in puzzle_set.words],
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
            "words": [serialize_word(word, include_correct=False) for word in words],
        })
    return result


def check_answer(db: Session, set_id: int, selected_word_id: int) -> dict:
    puzzle_set = get_set(db, set_id)
    if not puzzle_set or puzzle_set.status != "published":
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_set_not_found")
    correct_word = next((word for word in puzzle_set.words if word.is_correct), None)
    if not correct_word:
        raise HTTPException(status_code=422, detail="puzzle_has_no_correct_word")
    selected_exists = any(word.id == selected_word_id for word in puzzle_set.words)
    if not selected_exists:
        raise HTTPException(status_code=404, detail="vocabulary_puzzle_word_not_found")
    return {
        "correct": int(correct_word.id) == int(selected_word_id),
        "correct_word_id": correct_word.id,
        "explanation": puzzle_set.explanation,
    }
