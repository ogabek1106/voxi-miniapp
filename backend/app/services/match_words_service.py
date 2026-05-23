import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import MatchWord, MatchWordsSession, User


LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


def _clean_optional(value):
    value = str(value or "").strip()
    return value or None


def serialize_entry(entry: MatchWord) -> dict:
    return {
        "id": entry.id,
        "english_text": entry.english_text,
        "translation_text": entry.translation_text,
        "level": entry.level,
        "theme": entry.theme,
        "is_active": bool(entry.is_active),
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def list_entries(db: Session) -> list[MatchWord]:
    return db.query(MatchWord).order_by(MatchWord.id.desc()).all()


def list_active_entries(db: Session) -> list[MatchWord]:
    return (
        db.query(MatchWord)
        .filter(MatchWord.is_active.is_(True))
        .all()
    )


def get_entry(db: Session, entry_id: int) -> MatchWord | None:
    return db.query(MatchWord).filter(MatchWord.id == entry_id).first()


def create_entry(db: Session, payload) -> MatchWord:
    entry = MatchWord(
        english_text=payload.english_text,
        translation_text=payload.translation_text,
        level=(payload.level or "B1").upper(),
        theme=_clean_optional(payload.theme),
        is_active=bool(payload.is_active),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db: Session, entry_id: int, payload) -> MatchWord | None:
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    entry.english_text = payload.english_text
    entry.translation_text = payload.translation_text
    entry.level = (payload.level or "B1").upper()
    entry.theme = _clean_optional(payload.theme)
    entry.is_active = bool(payload.is_active)
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


def set_active(db: Session, entry_id: int, is_active: bool) -> MatchWord | None:
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    entry.is_active = bool(is_active)
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


def build_game_payload(db: Session) -> dict:
    entries = [
        entry for entry in list_active_entries(db)
        if (entry.english_text or "").strip() and (entry.translation_text or "").strip()
    ]
    random.shuffle(entries)
    return {"entries": [serialize_entry(entry) for entry in entries]}


def list_admin_stats(db: Session) -> dict:
    sessions = (
        db.query(MatchWordsSession, User)
        .outerjoin(User, MatchWordsSession.user_id == User.id)
        .order_by(MatchWordsSession.started_at.desc())
        .limit(300)
        .all()
    )
    finished_query = db.query(MatchWordsSession).filter(MatchWordsSession.finished_at.isnot(None))
    total_sessions = finished_query.count()
    unique_users = (
        db.query(func.count(func.distinct(func.coalesce(MatchWordsSession.telegram_id, MatchWordsSession.user_id))))
        .filter(MatchWordsSession.finished_at.isnot(None))
        .scalar()
        or 0
    )
    total_correct = db.query(func.coalesce(func.sum(MatchWordsSession.correct_count), 0)).scalar() or 0
    total_wrong = db.query(func.coalesce(func.sum(MatchWordsSession.wrong_count), 0)).scalar() or 0
    highest_combo = db.query(func.coalesce(func.max(MatchWordsSession.best_combo), 0)).scalar() or 0
    total_xp = db.query(func.coalesce(func.sum(MatchWordsSession.xp_earned), 0)).scalar() or 0
    avg_survival = db.query(func.coalesce(func.avg(MatchWordsSession.survived_seconds), 0)).scalar() or 0

    return {
        "summary": {
            "total_sessions": int(total_sessions),
            "unique_users": int(unique_users),
            "total_correct": int(total_correct),
            "total_wrong": int(total_wrong),
            "highest_combo": int(highest_combo),
            "total_xp": int(total_xp),
            "average_survival_seconds": round(float(avg_survival or 0), 1),
        },
        "items": [_serialize_session(session, user) for session, user in sessions],
    }


def _serialize_session(session: MatchWordsSession, user: User | None) -> dict:
    full_name = " ".join([user.name or "", user.surname or ""]).strip() if user else ""
    return {
        "id": session.id,
        "telegram_id": session.telegram_id,
        "user_name": full_name or (user.username if user else None) or (str(session.telegram_id) if session.telegram_id else "Visitor"),
        "correct_count": int(session.correct_count or 0),
        "wrong_count": int(session.wrong_count or 0),
        "best_combo": int(session.best_combo or 0),
        "survived_seconds": int(session.survived_seconds or 0),
        "average_match_seconds": session.average_match_seconds,
        "xp_earned": int(session.xp_earned or 0),
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "finished_at": session.finished_at.isoformat() if session.finished_at else None,
    }


def create_session(db: Session, payload) -> MatchWordsSession:
    session = MatchWordsSession(
        user_id=payload.user_id,
        telegram_id=payload.telegram_id,
        status="started",
        started_at=datetime.utcnow(),
        meta={},
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _safe_level_counts(raw: dict | None) -> dict[str, int]:
    counts: dict[str, int] = {}
    for key, value in (raw or {}).items():
        level = str(key or "").upper()
        if level in LEVELS:
            counts[level] = max(0, int(value or 0))
    return counts


def _award_match_words_xp(db: Session, session: MatchWordsSession, level_counts: dict[str, int]) -> int:
    from app.services import xp_service

    correct = int(session.correct_count or 0)
    best_combo = int(session.best_combo or 0)
    survived = int(session.survived_seconds or 0)
    avg_speed = float(session.average_match_seconds or 0)
    grants: list[tuple[int, str, dict | None]] = []

    if survived >= 180:
        grants.append((5, "match_words_active_play_3_min", {"seconds": survived}))
        extra = int((survived - 180) // 180)
        if extra > 0:
            grants.append((extra * 3, "match_words_active_play_next_3_min", {"blocks": extra}))

    for threshold, amount in [(100, 40), (50, 20), (25, 10), (10, 5)]:
        if correct >= threshold:
            grants.append((amount, f"match_words_correct_{threshold}", {"correct_count": correct}))
            break

    for threshold, amount in [(5, 40), (4, 25), (3, 15), (2, 7), (1, 3)]:
        if best_combo >= threshold:
            grants.append((amount, f"match_words_combo_x{threshold}", {"best_combo": best_combo}))
            break

    if avg_speed and avg_speed < 2:
        grants.append((15, "match_words_speed_under_2_sec", {"average_match_seconds": avg_speed}))
    elif avg_speed and avg_speed < 3:
        grants.append((8, "match_words_speed_under_3_sec", {"average_match_seconds": avg_speed}))
    elif avg_speed and avg_speed < 5:
        grants.append((3, "match_words_speed_under_5_sec", {"average_match_seconds": avg_speed}))

    for threshold, amount in [(600, 50), (360, 20), (240, 10), (120, 5)]:
        if survived >= threshold:
            grants.append((amount, f"match_words_survival_{threshold}_sec", {"seconds": survived}))
            break

    b_matches = int(level_counts.get("B1", 0) or 0) + int(level_counts.get("B2", 0) or 0)
    c_matches = int(level_counts.get("C1", 0) or 0) + int(level_counts.get("C2", 0) or 0)
    if b_matches > 0:
        grants.append((b_matches, "match_words_difficulty_b1_b2", {"matches": b_matches}))
    if c_matches > 0:
        grants.append((c_matches * 2, "match_words_difficulty_c1_c2", {"matches": c_matches}))

    total = 0
    for amount, reason, meta in grants:
        event = xp_service.add_xp(
            db,
            user_id=session.user_id,
            telegram_id=session.telegram_id,
            amount=amount,
            source_type="match_words",
            reason=reason,
            related_session_id=session.id,
            meta=meta,
            event_key=f"match_words:{reason}:session:{session.id}",
        )
        if event:
            total += int(event.amount or 0)
    return total


def finish_session(db: Session, session_id: int, payload) -> MatchWordsSession:
    session = db.query(MatchWordsSession).filter(MatchWordsSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="match_words_session_not_found")
    level_counts = _safe_level_counts(payload.level_counts)
    session.user_id = payload.user_id or session.user_id
    session.telegram_id = payload.telegram_id or session.telegram_id
    session.correct_count = max(0, int(payload.correct_count or 0))
    session.wrong_count = max(0, int(payload.wrong_count or 0))
    session.best_combo = max(0, int(payload.best_combo or 0))
    session.survived_seconds = max(0, int(payload.survived_seconds or 0))
    session.average_match_seconds = max(0, float(payload.average_match_seconds or 0)) if payload.average_match_seconds is not None else None
    session.status = payload.status or "finished"
    session.meta = {"level_counts": level_counts}
    session.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    earned = _award_match_words_xp(db, session, level_counts)
    if earned:
        session.xp_earned = int(session.xp_earned or 0) + earned
        db.add(session)
        db.commit()
        db.refresh(session)
    return session
