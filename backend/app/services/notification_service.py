from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AppNotification, AppNotificationRead, AppNotificationRecipient, User
from app.schemas.notifications import NOTIFICATION_CATEGORIES
from app.services.notification_audience_service import audience_label, resolve_audience


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


def utc_naive(value: datetime | None) -> datetime | None:
    if not value:
        return None
    if value.tzinfo:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


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
        "audience_type": notification.audience_type or "all",
        "audience_label": audience_label(notification.audience_type or "all"),
        "recipient_count": notification.recipient_count or 0,
        "created_at": iso(notification.created_at),
        "is_read": notification.id in read_ids,
    }


def read_identity(read: AppNotificationRead) -> str:
    if read.user_id:
        return f"user:{read.user_id}"
    if read.telegram_id:
        return f"tg:{read.telegram_id}"
    return f"read:{read.id}"


def seen_summary(db: Session, notification: AppNotification) -> dict:
    if notification.is_template:
        delivered_ids = [
            row_id for (row_id,) in db.query(AppNotification.id)
            .filter(AppNotification.source_template_id == notification.id)
            .all()
        ]
    else:
        delivered_ids = [notification.id]

    if not delivered_ids:
        return {"seen_24h": 0, "seen_total": 0, "delivered_count": 0}

    reads = (
        db.query(AppNotificationRead)
        .filter(AppNotificationRead.notification_id.in_(delivered_ids))
        .all()
    )
    now = datetime.now(timezone.utc) if any(read.read_at and read.read_at.tzinfo for read in reads) else datetime.utcnow()
    since = now - timedelta(hours=24)
    def is_recent(read: AppNotificationRead) -> bool:
        if not read.read_at:
            return False
        value = read.read_at
        boundary = since
        if value.tzinfo and not boundary.tzinfo:
            boundary = boundary.replace(tzinfo=timezone.utc)
        if boundary.tzinfo and not value.tzinfo:
            value = value.replace(tzinfo=timezone.utc)
        return value >= boundary

    total_identities = {read_identity(read) for read in reads}
    recent_identities = {read_identity(read) for read in reads if is_recent(read)}
    return {
        "seen_24h": len(recent_identities),
        "seen_total": len(total_identities),
        "delivered_count": len(delivered_ids),
    }


def serialize_admin_notification(db: Session, notification: AppNotification) -> dict:
    data = serialize_notification(notification)
    data.update(seen_summary(db, notification))
    return data


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
        audience_type=template.audience_type or "all",
        recipient_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(notification)
    return notification


def clear_recipients(db: Session, notification_id: int) -> None:
    db.query(AppNotificationRecipient).filter(
        AppNotificationRecipient.notification_id == notification_id
    ).delete(synchronize_session=False)


def materialize_recipients(db: Session, notification: AppNotification) -> None:
    if notification.is_template:
        notification.audience_type = notification.audience_type or "all"
        notification.recipient_count = notification.recipient_count or 0
        return

    clear_recipients(db, int(notification.id))
    audience = resolve_audience(db, notification.category)
    notification.audience_type = audience.audience_type
    if audience.audience_type == "all":
        notification.recipient_count = 0
        return

    seen: set[str] = set()
    count = 0
    for user in audience.users:
        user_id = int(user.id) if user.id else None
        telegram_id = int(user.telegram_id) if user.telegram_id else None
        key = f"user:{user_id}" if user_id else f"tg:{telegram_id}"
        if key in seen or (not user_id and not telegram_id):
            continue
        seen.add(key)
        db.add(AppNotificationRecipient(
            notification_id=int(notification.id),
            user_id=user_id,
            telegram_id=telegram_id,
            created_at=datetime.utcnow(),
        ))
        count += 1
    notification.recipient_count = count


def set_template_audience_preview(db: Session, template: AppNotification) -> None:
    audience = resolve_audience(db, template.category)
    template.audience_type = audience.audience_type
    template.recipient_count = 0 if audience.audience_type == "all" else len(audience.users)


def sync_template_audience_from_latest_delivery(db: Session, template: AppNotification) -> None:
    latest = (
        db.query(AppNotification)
        .filter(AppNotification.source_template_id == template.id)
        .order_by(AppNotification.created_at.desc(), AppNotification.id.desc())
        .first()
    )
    if latest:
        template.audience_type = latest.audience_type or template.audience_type or "all"
        template.recipient_count = latest.recipient_count or 0


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

        delivery = clone_delivery_from_template(db, template, now)
        db.flush()
        materialize_recipients(db, delivery)
        sync_template_audience_from_latest_delivery(db, template)
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
    scheduled_at = utc_naive(scheduled_at)
    now = datetime.utcnow()
    is_template = mode in {"scheduled", "repeat"}
    next_send_at = None
    should_send_repeat_now = False
    if mode == "scheduled":
        next_send_at = scheduled_at
    elif mode == "repeat":
        if scheduled_at and scheduled_at > now:
            next_send_at = scheduled_at
        else:
            should_send_repeat_now = True
            next_send_at = now + timedelta(hours=repeat_hours or 24)

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
        audience_type="all",
        recipient_count=0,
        last_sent_at=None if is_template else now,
        sent_count=0 if is_template else 1,
        created_at=now,
        updated_at=now,
    )
    db.add(notification)
    db.flush()
    if not notification.is_template:
        materialize_recipients(db, notification)
    else:
        set_template_audience_preview(db, notification)
    if should_send_repeat_now and notification.is_enabled:
        delivery = clone_delivery_from_template(db, notification, now)
        db.flush()
        materialize_recipients(db, delivery)
        sync_template_audience_from_latest_delivery(db, notification)
        notification.sent_count = 1
        notification.last_sent_at = now
        notification.updated_at = now
        if notification.max_send_count and notification.sent_count >= notification.max_send_count:
            notification.is_enabled = False
    db.commit()
    db.refresh(notification)
    return notification


def update_notification(
    db: Session,
    notification_id: int,
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
) -> AppNotification | None:
    row = db.query(AppNotification).filter(AppNotification.id == notification_id).first()
    if not row:
        return None

    mode = normalize_schedule_mode(schedule_mode)
    repeat_hours = normalize_repeat_hours(repeat_interval_hours)
    scheduled_at = utc_naive(scheduled_at)
    now = datetime.utcnow()
    row.category = normalize_category(category)
    row.title = (title or "").strip()
    row.message = (message or "").strip()
    row.image_url = (image_url or "").strip() or None
    row.link_url = (link_url or "").strip() or None
    row.link_type = normalize_link_type(link_type)
    row.schedule_mode = mode
    row.scheduled_at = scheduled_at
    row.repeat_interval_hours = repeat_hours
    row.max_send_count = max_send_count if max_send_count and max_send_count > 0 else None
    row.cooldown_hours = cooldown_hours if cooldown_hours and cooldown_hours > 0 else None
    row.is_enabled = bool(is_enabled)
    row.is_template = mode in {"scheduled", "repeat"}
    if mode == "scheduled":
        row.next_send_at = scheduled_at
    elif mode == "repeat":
        if not row.next_send_at or row.next_send_at <= now:
            row.next_send_at = (scheduled_at if scheduled_at and scheduled_at > now else now + timedelta(hours=repeat_hours or 24))
    else:
        row.next_send_at = None
        row.is_template = False
    row.updated_at = now
    db.flush()
    if not row.is_template:
        materialize_recipients(db, row)
    else:
        set_template_audience_preview(db, row)
    db.commit()
    db.refresh(row)
    return row


def delete_notification(db: Session, notification_id: int) -> bool:
    row = db.query(AppNotification).filter(AppNotification.id == notification_id).first()
    if not row:
        return False
    notification_ids = [notification_id]
    if row.is_template:
        notification_ids.extend([
            row_id for (row_id,) in db.query(AppNotification.id)
            .filter(AppNotification.source_template_id == notification_id)
            .all()
        ])
    db.query(AppNotificationRead).filter(AppNotificationRead.notification_id.in_(notification_ids)).delete(synchronize_session=False)
    db.query(AppNotificationRecipient).filter(AppNotificationRecipient.notification_id.in_(notification_ids)).delete(synchronize_session=False)
    if row.is_template:
        db.query(AppNotification).filter(AppNotification.source_template_id == notification_id).delete(synchronize_session=False)
    db.delete(row)
    db.commit()
    return True


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


def visible_notification_filter(db: Session, user: User | None, telegram_id: int | None):
    base_filters = [
        AppNotification.audience_type == "all",
        AppNotification.audience_type.is_(None),
    ]
    recipient_filters = []
    if user and user.id:
        recipient_filters.append(AppNotificationRecipient.user_id == user.id)
    if user and user.telegram_id:
        recipient_filters.append(AppNotificationRecipient.telegram_id == user.telegram_id)
    if telegram_id:
        recipient_filters.append(AppNotificationRecipient.telegram_id == telegram_id)
    if not recipient_filters:
        return or_(*base_filters)

    targeted_ids = (
        db.query(AppNotificationRecipient.notification_id)
        .filter(or_(*recipient_filters))
        .subquery()
    )
    base_filters.append(AppNotification.id.in_(targeted_ids))
    return or_(*base_filters)


def can_view_notification(db: Session, notification: AppNotification, user: User | None, telegram_id: int | None) -> bool:
    if not notification.audience_type or notification.audience_type == "all":
        return True
    recipient_filters = [AppNotificationRecipient.notification_id == notification.id]
    identity_filters = []
    if user and user.id:
        identity_filters.append(AppNotificationRecipient.user_id == user.id)
    if user and user.telegram_id:
        identity_filters.append(AppNotificationRecipient.telegram_id == user.telegram_id)
    if telegram_id:
        identity_filters.append(AppNotificationRecipient.telegram_id == telegram_id)
    if not identity_filters:
        return False
    return db.query(AppNotificationRecipient.id).filter(*recipient_filters).filter(or_(*identity_filters)).first() is not None


def list_notifications(db: Session, *, user: User | None = None, telegram_id: int | None = None) -> dict:
    dispatch_due_notifications(db)
    filters = read_filters(user, telegram_id)
    reads = []
    if filters:
        reads = db.query(AppNotificationRead).filter(or_(*filters)).all()
    read_ids = {int(read.notification_id) for read in reads if read.notification_id}

    notifications = (
        db.query(AppNotification)
        .filter(
            AppNotification.is_template == False,  # noqa: E712
            AppNotification.is_enabled == True,  # noqa: E712
            visible_notification_filter(db, user, telegram_id),
        )
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
    if not can_view_notification(db, notification, user, telegram_id):
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
    data = list_notifications(db, user=user, telegram_id=telegram_id)
    for item in data.get("notifications", []):
        mark_read(db, int(item["id"]), user=user, telegram_id=telegram_id)


def list_admin_notifications(db: Session) -> list[dict]:
    dispatch_due_notifications(db)
    rows = (
        db.query(AppNotification)
        .filter(or_(AppNotification.is_template == True, AppNotification.source_template_id.is_(None)))  # noqa: E712
        .order_by(AppNotification.created_at.desc(), AppNotification.id.desc())
        .limit(150)
        .all()
    )
    return [serialize_admin_notification(db, row) for row in rows]
