import random
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import ShadowWritingAttempt, ShadowWritingEssay, User


def serialize_essay(essay: ShadowWritingEssay) -> dict:
    return {
        "id": essay.id,
        "title": essay.title,
        "level": essay.level,
        "theme": essay.theme,
        "text": essay.text,
        "created_at": essay.created_at.isoformat() if essay.created_at else None,
        "updated_at": essay.updated_at.isoformat() if essay.updated_at else None,
    }


def serialize_attempt(attempt: ShadowWritingAttempt) -> dict:
    essay = attempt.essay
    return {
        "id": attempt.id,
        "attempt_id": attempt.id,
        "telegram_id": attempt.telegram_id,
        "essay_id": attempt.essay_id,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "time_seconds": attempt.time_seconds,
        "accuracy": attempt.accuracy,
        "mistakes_count": attempt.mistakes_count,
        "typed_chars": attempt.typed_chars,
        "essay": serialize_essay(essay) if essay else None,
    }


def create_essay(db: Session, payload) -> ShadowWritingEssay:
    essay = ShadowWritingEssay(
        title=(payload.title or "").strip() or None,
        level=str(payload.level or "").strip(),
        theme=str(payload.theme or "").strip(),
        text=str(payload.text or "").strip(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(essay)
    db.commit()
    db.refresh(essay)
    return essay


def list_essays(db: Session) -> list[ShadowWritingEssay]:
    return db.query(ShadowWritingEssay).order_by(ShadowWritingEssay.id.desc()).all()


def delete_essay(db: Session, essay_id: int) -> bool:
    essay = db.query(ShadowWritingEssay).filter(ShadowWritingEssay.id == essay_id).first()
    if not essay:
        return False
    db.delete(essay)
    db.commit()
    return True


def start_next_attempt(db: Session, telegram_id: int) -> ShadowWritingAttempt | None:
    essays = db.query(ShadowWritingEssay).order_by(ShadowWritingEssay.id.asc()).all()
    if not essays:
        return None

    essay_ids = [essay.id for essay in essays]
    used_ids = {
        row[0]
        for row in db.query(ShadowWritingAttempt.essay_id)
        .filter(
            ShadowWritingAttempt.telegram_id == telegram_id,
            ShadowWritingAttempt.essay_id.in_(essay_ids),
        )
        .all()
    }
    available = [essay for essay in essays if essay.id not in used_ids] or essays
    essay = random.choice(available)

    attempt = ShadowWritingAttempt(
        telegram_id=telegram_id,
        essay_id=essay.id,
        started_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    attempt.essay = essay
    return attempt


def complete_attempt(db: Session, payload) -> ShadowWritingAttempt | None:
    attempt = None
    if payload.attempt_id:
        attempt = (
            db.query(ShadowWritingAttempt)
            .filter(
                ShadowWritingAttempt.id == payload.attempt_id,
                ShadowWritingAttempt.telegram_id == payload.telegram_id,
            )
            .first()
        )

    if not attempt:
        attempt = (
            db.query(ShadowWritingAttempt)
            .filter(
                ShadowWritingAttempt.telegram_id == payload.telegram_id,
                ShadowWritingAttempt.essay_id == payload.essay_id,
                ShadowWritingAttempt.completed_at == None,
            )
            .order_by(ShadowWritingAttempt.started_at.desc())
            .first()
        )

    if not attempt:
        attempt = ShadowWritingAttempt(
            telegram_id=payload.telegram_id,
            essay_id=payload.essay_id,
            started_at=datetime.utcnow(),
        )
        db.add(attempt)

    attempt.completed_at = datetime.utcnow()
    attempt.time_seconds = max(0, int(payload.time_seconds or 0))
    attempt.accuracy = max(0, min(100, float(payload.accuracy or 0)))
    attempt.mistakes_count = max(0, int(payload.mistakes_count or 0))
    attempt.typed_chars = max(0, int(payload.typed_chars or 0))
    db.commit()
    db.refresh(attempt)
    return attempt


def list_history(db: Session, telegram_id: int) -> list[ShadowWritingAttempt]:
    return (
        db.query(ShadowWritingAttempt)
        .options(joinedload(ShadowWritingAttempt.essay))
        .filter(
            ShadowWritingAttempt.telegram_id == telegram_id,
            ShadowWritingAttempt.completed_at != None,
        )
        .order_by(ShadowWritingAttempt.completed_at.desc())
        .all()
    )


def _speed_wpm(attempt: ShadowWritingAttempt) -> float:
    seconds = int(attempt.time_seconds or 0)
    typed_chars = int(attempt.typed_chars or 0)
    if seconds <= 0:
        return 0.0
    return round((typed_chars / 5) / (seconds / 60), 1)


def _login_method(user: User | None) -> str | None:
    if not user:
        return None
    if user.google_id:
        return "Google"
    if user.telegram_id:
        return "Telegram"
    if user.email:
        return "Email"
    return None


def list_admin_stats(db: Session) -> dict:
    rows = (
        db.query(ShadowWritingAttempt, ShadowWritingEssay, User)
        .join(ShadowWritingEssay, ShadowWritingAttempt.essay_id == ShadowWritingEssay.id)
        .outerjoin(User, ShadowWritingAttempt.telegram_id == User.telegram_id)
        .filter(ShadowWritingAttempt.completed_at != None)
        .order_by(ShadowWritingAttempt.completed_at.desc())
        .all()
    )

    items = []
    total_accuracy = 0.0
    total_speed = 0.0
    total_time = 0
    unique_users = set()

    for attempt, essay, user in rows:
        speed = _speed_wpm(attempt)
        accuracy = round(float(attempt.accuracy or 0), 1)
        time_seconds = int(attempt.time_seconds or 0)
        telegram_id = attempt.telegram_id
        if telegram_id is not None:
            unique_users.add(int(telegram_id))

        total_accuracy += accuracy
        total_speed += speed
        total_time += time_seconds
        user_name = " ".join(
            part for part in [
                (user.name or "").strip() if user else "",
                (user.surname or "").strip() if user else "",
            ] if part
        ) or None

        items.append({
            "attempt_id": attempt.id,
            "telegram_id": telegram_id,
            "user_name": user_name,
            "login_method": _login_method(user),
            "essay_title": essay.title,
            "essay_level": essay.level,
            "essay_theme": essay.theme,
            "time_seconds": time_seconds,
            "speed_wpm": speed,
            "accuracy": accuracy,
            "mistakes_count": int(attempt.mistakes_count or 0),
            "typed_chars": int(attempt.typed_chars or 0),
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        })

    total_attempts = len(items)
    return {
        "summary": {
            "total_attempts": total_attempts,
            "unique_users": len(unique_users),
            "average_accuracy": round(total_accuracy / total_attempts, 1) if total_attempts else 0,
            "average_speed_wpm": round(total_speed / total_attempts, 1) if total_attempts else 0,
            "total_time_seconds": total_time,
        },
        "items": items,
    }
