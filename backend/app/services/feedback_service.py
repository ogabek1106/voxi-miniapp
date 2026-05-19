from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AppFeedback, User


ALLOWED_STATUSES = {"submitted", "skipped"}


def _clean_text(value: str | None, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _resolve_user_id(db: Session, payload) -> int | None:
    if payload.user_id:
        return int(payload.user_id)
    if payload.telegram_id:
        user = db.query(User).filter(User.telegram_id == int(payload.telegram_id)).first()
        return user.id if user else None
    return None


def _find_existing(db: Session, payload, user_id: int | None) -> AppFeedback | None:
    feature_type = _clean_text(payload.feature_type, 80)
    context_key = _clean_text(payload.context_key, 180)
    query = db.query(AppFeedback).filter(
        AppFeedback.feature_type == feature_type,
        AppFeedback.context_key == context_key,
    )
    if payload.telegram_id:
        existing = query.filter(AppFeedback.telegram_id == int(payload.telegram_id)).first()
        if existing:
            return existing
    if user_id:
        return query.filter(AppFeedback.user_id == int(user_id)).first()
    return None


def serialize_feedback(row: AppFeedback) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "telegram_id": row.telegram_id,
        "feature_type": row.feature_type,
        "context_key": row.context_key,
        "rating": row.rating,
        "comment": row.comment,
        "public_permission": bool(row.public_permission),
        "public_approved": bool(row.public_approved),
        "is_hidden": bool(row.is_hidden),
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


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


def list_admin_feedback(db: Session) -> list[dict]:
    rows = (
        db.query(AppFeedback, User)
        .outerjoin(
            User,
            or_(
                AppFeedback.user_id == User.id,
                AppFeedback.telegram_id == User.telegram_id,
            ),
        )
        .order_by(AppFeedback.created_at.desc())
        .limit(500)
        .all()
    )
    items = []
    for feedback, user in rows:
        user_name = " ".join(
            part for part in [
                (user.name or "").strip() if user else "",
                (user.surname or "").strip() if user else "",
            ] if part
        ) or None
        items.append({
            **serialize_feedback(feedback),
            "user_name": user_name,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "login_method": _login_method(user),
        })
    return items


def submit_feedback(db: Session, payload) -> AppFeedback:
    status = _clean_text(payload.status, 20).lower() or "submitted"
    if status not in ALLOWED_STATUSES:
        raise ValueError("invalid_feedback_status")

    rating = int(payload.rating) if payload.rating is not None else None
    if status == "submitted" and not rating:
        raise ValueError("rating_required")

    comment = _clean_text(payload.comment, 2000)
    user_id = _resolve_user_id(db, payload)
    existing = _find_existing(db, payload, user_id)
    now = datetime.utcnow()

    row = existing or AppFeedback(
        user_id=user_id,
        telegram_id=int(payload.telegram_id) if payload.telegram_id else None,
        feature_type=_clean_text(payload.feature_type, 80),
        context_key=_clean_text(payload.context_key, 180),
        created_at=now,
    )

    row.user_id = user_id or row.user_id
    row.telegram_id = int(payload.telegram_id) if payload.telegram_id else row.telegram_id
    row.rating = rating
    row.comment = comment or None
    row.public_permission = bool(payload.public_permission and comment)
    row.status = status
    row.updated_at = now

    if not existing:
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
