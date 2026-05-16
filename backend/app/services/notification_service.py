from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AppNotification, AppNotificationRead, User


def normalize_link_type(value: Optional[str]) -> str:
    cleaned = (value or "none").strip().lower()
    return cleaned if cleaned in {"none", "internal", "external"} else "none"


def serialize_notification(notification: AppNotification, read_ids: set[int] | None = None) -> dict:
    read_ids = read_ids or set()
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "image_url": notification.image_url,
        "link_url": notification.link_url,
        "link_type": notification.link_type or "none",
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "is_read": notification.id in read_ids,
    }


def create_notification(
    db: Session,
    *,
    title: str,
    message: str,
    image_url: str | None = None,
    link_url: str | None = None,
    link_type: str | None = None,
) -> AppNotification:
    notification = AppNotification(
        title=(title or "").strip(),
        message=(message or "").strip(),
        image_url=(image_url or "").strip() or None,
        link_url=(link_url or "").strip() or None,
        link_type=normalize_link_type(link_type),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def resolve_user(db: Session, telegram_id: int | None, session_user: User | None) -> User | None:
    if session_user:
        return session_user
    if telegram_id:
        return db.query(User).filter(User.telegram_id == telegram_id).first()
    return None


def read_filters(user: User | None, telegram_id: int | None):
    filters = []
    if user:
        filters.append(AppNotificationRead.user_id == user.id)
        if user.telegram_id:
            filters.append(AppNotificationRead.telegram_id == user.telegram_id)
    if telegram_id:
        filters.append(AppNotificationRead.telegram_id == telegram_id)
    return filters


def list_notifications(db: Session, *, user: User | None = None, telegram_id: int | None = None) -> dict:
    filters = read_filters(user, telegram_id)
    reads = []
    if filters:
        reads = db.query(AppNotificationRead).filter(or_(*filters)).all()
    read_ids = {int(read.notification_id) for read in reads if read.notification_id}

    notifications = (
        db.query(AppNotification)
        .order_by(AppNotification.created_at.desc(), AppNotification.id.desc())
        .limit(50)
        .all()
    )
    items = [serialize_notification(item, read_ids) for item in notifications]
    return {
        "notifications": items,
        "unread_count": sum(1 for item in items if not item["is_read"]),
    }


def mark_read(db: Session, notification_id: int, *, user: User | None = None, telegram_id: int | None = None) -> bool:
    notification = db.query(AppNotification).filter(AppNotification.id == notification_id).first()
    if not notification:
        return False

    identity_user_id = user.id if user else None
    identity_telegram_id = telegram_id or (user.telegram_id if user else None)
    if not identity_user_id and not identity_telegram_id:
        return True

    filters = [AppNotificationRead.notification_id == notification_id]
    identity_filters = read_filters(user, identity_telegram_id)
    existing = None
    if identity_filters:
        existing = db.query(AppNotificationRead).filter(*filters).filter(or_(*identity_filters)).first()
    if existing:
        return True

    db.add(AppNotificationRead(
        notification_id=notification_id,
        user_id=identity_user_id,
        telegram_id=identity_telegram_id,
        read_at=datetime.utcnow(),
    ))
    db.commit()
    return True


def mark_all_read(db: Session, *, user: User | None = None, telegram_id: int | None = None) -> None:
    notifications = db.query(AppNotification.id).all()
    for (notification_id,) in notifications:
        mark_read(db, int(notification_id), user=user, telegram_id=telegram_id)
