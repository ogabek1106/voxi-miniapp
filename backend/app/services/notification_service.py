from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AppNotification, AppNotificationRead, User
from app.schemas.notifications import NOTIFICATION_CATEGORIES


REPEAT_INTERVALS = {1, 4, 24, 48, 72}


def normalize_link_type(value: Optional[str]) -> str:
    cleaned = (value or "none").strip().lower()
    return cleaned if cleaned in {"none", "internal", "external"} else "none"


def normalize_category(value: Optional[str]) -> str:
    cleaned = (value or "custom_manual_notification").strip().lower()
    return cleaned if cleaned in NOTIFICATION_CATEGORIES else "custom_manual_notification"


def normalize_schedule_mode(value: Optional[str]) -> str:
    cleaned = (value or "now").strip().lower()
    return cleaned if cleaned in {"now", "scheduled", "repeat"} else "now"


def normalize_repeat_hours(value: int | None) -> int | None:
    if value is None:
        return None
    try:
        hours = int(value)
    except (TypeError, ValueError):
        return None
    return hours if hours in REPEAT_INTERVALS else None


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def serialize_notification(notification: AppNotification, read_ids: set[int] | None = None) -> dict:
    read_ids = read_ids or set()
    return {
        "id": notification.id,
        "category": notification.category or "custom_manual_notification",
        "title": notification.title,
        "message": notification.message,
        "image_url": notification.image_url,
        "link_url": notification.link_url,
        "link_type": notification.link_type or "none",
        "schedule_mode": notification.schedule_mode or "now",
        "scheduled_at": iso(notification.scheduled_at),
        "repeat_interval_hours": notification.repeat_interval_hours,
        "next_send_at": iso(notification.next_send_at),
        "last_sent_at": iso(notification.last_sent_at),
        "sent_count": notification.sent_count or 0,
        "max_send_count": notification.max_send_count,
        "cooldown_hours": notification.cooldown_hours,
        "is_enabled": bool(notification.is_enabled),
        "is_template": bool(notification.is_template),
        "source_template_id": notification.source_template_id,
        "created_at": iso(notification.created_at),
        "is_read": notification.id in read_ids,
    }


def clone_delivery_from_template(db: Session, template: AppNotification, now: datetime) -> AppNotification:
    notification = AppNotification(
        category=normalize_category(template.category),
        title=template.title,
        message=template.message,
        image_url=template.image_url,
        link_url=template.link_url,
        link_type=normalize_link_type(template.link_type),
        schedule_mode="now",
        last_sent_at=now,
        sent_count=1,
        is_enabled=True,
        is_template=False,
        source_template_id=template.id,
        created_at=now,
        updated_at=now,
    )
    db.add(notification)
    return notification


def dispatch_due_notifications(db: Session) -> int:
    now = datetime.utcnow()
    templates = (
        db.query(AppNotification)
        .filter(
            AppNotification.is_template == True,  # noqa: E712
            AppNotification.is_enabled == True,  # noqa: E712
            AppNotification.next_send_at.isnot(None),
            AppNotification.next_send_at <= now,
        )
        .all()
    )
    dispatched = 0
    for template in templates:
        if template.max_send_count and (template.sent_count or 0) >= template.max_send_count:
            template.is_enabled = False
            template.updated_at = now
            continue

        clone_delivery_from_template(db, template, now)
        template.sent_count = (template.sent_count or 0) + 1
        template.last_sent_at = now
        template.updated_at = now
        dispatched += 1

        if template.schedule_mode == "repeat" and template.repeat_interval_hours:
            template.next_send_at = now + timedelta(hours=int(template.repeat_interval_hours))
            if template.max_send_count and template.sent_count >= template.max_send_count:
                template.is_enabled = False
        else:
            template.next_send_at = None
            template.is_enabled = False

    if dispatched or templates:
        db.commit()
    return dispatched


def create_notification(
    db: Session,
    *,
    title: str,
    message: str,
    category: str | None = None,
    image_url: str | None = None,
    link_url: str | None = None,
    link_type: str | None = None,
    schedule_mode: str | None = None,
    scheduled_at: datetime | None = None,
    repeat_interval_hours: int | None = None,
    max_send_count: int | None = None,
    cooldown_hours: int | None = None,
    is_enabled: bool = True,
) -> AppNotification:
    mode = normalize_schedule_mode(schedule_mode)
    repeat_hours = normalize_repeat_hours(repeat_interval_hours)
    now = datetime.utcnow()
    is_template = mode in {"scheduled", "repeat"}
    next_send_at = None
    if mode == "scheduled":
        next_send_at = scheduled_at
    elif mode == "repeat":
        next_send_at = scheduled_at or now + timedelta(hours=repeat_hours or 24)

    notification = AppNotification(
        category=normalize_category(category),
        title=(title or "").strip(),
        message=(message or "").strip(),
        image_url=(image_url or "").strip() or None,
        link_url=(link_url or "").strip() or None,
        link_type=normalize_link_type(link_type),
        schedule_mode=mode,
        scheduled_at=scheduled_at,
        repeat_interval_hours=repeat_hours,
        next_send_at=next_send_at,
        max_send_count=max_send_count if max_send_count and max_send_count > 0 else None,
        cooldown_hours=cooldown_hours if cooldown_hours and cooldown_hours > 0 else None,
        is_enabled=bool(is_enabled),
        is_template=is_template,
        last_sent_at=None if is_template else now,
        sent_count=0 if is_template else 1,
        created_at=now,
        updated_at=now,
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
    dispatch_due_notifications(db)
    filters = read_filters(user, telegram_id)
    reads = []
    if filters:
        reads = db.query(AppNotificationRead).filter(or_(*filters)).all()
    read_ids = {int(read.notification_id) for read in reads if read.notification_id}

    notifications = (
        db.query(AppNotification)
        .filter(AppNotification.is_template == False, AppNotification.is_enabled == True)  # noqa: E712
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
    notification = (
        db.query(AppNotification)
        .filter(AppNotification.id == notification_id, AppNotification.is_template == False)  # noqa: E712
        .first()
    )
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
    notifications = db.query(AppNotification.id).filter(AppNotification.is_template == False).all()  # noqa: E712
    for (notification_id,) in notifications:
        mark_read(db, int(notification_id), user=user, telegram_id=telegram_id)


def list_admin_notifications(db: Session) -> list[dict]:
    dispatch_due_notifications(db)
    rows = (
        db.query(AppNotification)
        .order_by(AppNotification.created_at.desc(), AppNotification.id.desc())
        .limit(150)
        .all()
    )
    return [serialize_notification(row) for row in rows]
