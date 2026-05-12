import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import User, WordShuffleEntry, WordShuffleSession


def clean_optional(value):
    value = str(value or "").strip()
    return value or None


def serialize_entry(entry: WordShuffleEntry) -> dict:
    return {
        "id": entry.id,
        "word": entry.word,
        "translation": entry.translation,
        "example_sentence": entry.example_sentence,
        "cefr_level": entry.cefr_level,
        "category": entry.category,
        "difficulty": entry.difficulty,
        "status": entry.status,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def list_entries(db: Session) -> list[WordShuffleEntry]:
    return db.query(WordShuffleEntry).order_by(WordShuffleEntry.id.desc()).all()


def list_active_entries(db: Session) -> list[WordShuffleEntry]:
    return (
        db.query(WordShuffleEntry)
        .filter(WordShuffleEntry.status == "active")
        .all()
    )


def get_entry(db: Session, entry_id: int) -> WordShuffleEntry | None:
    return db.query(WordShuffleEntry).filter(WordShuffleEntry.id == entry_id).first()


def create_entry(db: Session, payload) -> WordShuffleEntry:
    entry = WordShuffleEntry(
        word=payload.word,
        translation=payload.translation,
        example_sentence=clean_optional(payload.example_sentence),
        cefr_level=clean_optional(payload.cefr_level),
        category=clean_optional(payload.category),
        difficulty=payload.difficulty or "easy",
        status=payload.status or "inactive",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db: Session, entry_id: int, payload) -> WordShuffleEntry | None:
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    entry.word = payload.word
    entry.translation = payload.translation
    entry.example_sentence = clean_optional(payload.example_sentence)
    entry.cefr_level = clean_optional(payload.cefr_level)
    entry.category = clean_optional(payload.category)
    entry.difficulty = payload.difficulty or "easy"
    entry.status = payload.status or entry.status or "inactive"
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry_id: int) -> bool:
    entry = get_entry(db, entry_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


def set_status(db: Session, entry_id: int, status: str) -> WordShuffleEntry | None:
    if status not in {"active", "inactive"}:
        raise HTTPException(status_code=422, detail="invalid_status")
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    entry.status = status
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


def build_game_payload(db: Session) -> dict:
    entries = [entry for entry in list_active_entries(db) if len((entry.word or "").strip()) >= 2]
    random.shuffle(entries)
    return {"entries": [serialize_entry(entry) for entry in entries]}


def create_session(db: Session, payload) -> WordShuffleSession:
    session = WordShuffleSession(
        user_id=payload.user_id,
        telegram_id=payload.telegram_id,
        score=0,
        solved_count=0,
        best_streak=0,
        status="started",
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def finish_session(db: Session, session_id: int, payload) -> WordShuffleSession:
    session = db.query(WordShuffleSession).filter(WordShuffleSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="word_shuffle_session_not_found")
    session.user_id = payload.user_id or session.user_id
    session.telegram_id = payload.telegram_id or session.telegram_id
    session.score = max(0, int(payload.score or 0))
    session.solved_count = max(0, int(payload.solved_count or 0))
    session.best_streak = max(0, int(payload.best_streak or 0))
    session.status = payload.status or "finished"
    session.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def _user_name(user: User | None, session: WordShuffleSession) -> str | None:
    if user:
        full_name = " ".join(part for part in [user.name, user.surname] if part)
        return full_name or user.email or (str(user.telegram_id) if user.telegram_id else None)
    return str(session.telegram_id) if session.telegram_id else None


def _login_method(user: User | None, session: WordShuffleSession) -> str | None:
    if user:
        if user.google_id:
            return "Google"
        if user.email and user.password_hash:
            return "Email"
        if user.telegram_id:
            return "Telegram"
    if session.telegram_id:
        return "Telegram"
    return None


def _duration_seconds(session: WordShuffleSession) -> int:
    if not session.started_at or not session.finished_at:
        return 0
    return max(0, int((session.finished_at - session.started_at).total_seconds()))


def list_admin_stats(db: Session) -> dict:
    rows = (
        db.query(WordShuffleSession, User)
        .outerjoin(
            User,
            or_(
                WordShuffleSession.user_id == User.id,
                WordShuffleSession.telegram_id == User.telegram_id,
            ),
        )
        .filter(WordShuffleSession.finished_at.isnot(None))
        .order_by(WordShuffleSession.finished_at.desc())
        .all()
    )
    sessions = [row[0] for row in rows]
    total_sessions = len(sessions)
    unique_keys = {
        session.user_id or session.telegram_id
        for session in sessions
        if session.user_id or session.telegram_id
    }
    total_solved = sum(int(session.solved_count or 0) for session in sessions)
    total_score = sum(int(session.score or 0) for session in sessions)
    total_time = sum(_duration_seconds(session) for session in sessions)
    summary = {
        "total_sessions": total_sessions,
        "unique_users": len(unique_keys),
        "total_solved": total_solved,
        "average_score": (total_score / total_sessions) if total_sessions else 0,
        "highest_score": max([int(session.score or 0) for session in sessions] or [0]),
        "highest_streak": max([int(session.best_streak or 0) for session in sessions] or [0]),
        "total_time_seconds": total_time,
    }
    items = []
    for session, user in rows:
        duration = _duration_seconds(session)
        solved_count = int(session.solved_count or 0)
        items.append({
            "session_id": session.id,
            "telegram_id": session.telegram_id,
            "user_name": _user_name(user, session),
            "login_method": _login_method(user, session),
            "score": int(session.score or 0),
            "solved_count": solved_count,
            "best_streak": int(session.best_streak or 0),
            "status": session.status,
            "time_seconds": duration,
            "average_time_per_word": (duration / solved_count) if solved_count else 0,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.finished_at.isoformat() if session.finished_at else None,
        })
    return {"summary": summary, "items": items}
