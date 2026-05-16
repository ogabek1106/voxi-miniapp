from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.notifications import NotificationIn, NotificationReadIn
from app.services.auth_service import get_session_user
from app.services import notification_service as service

router = APIRouter(tags=["notifications"])


def require_admin(admin_id: int):
    if admin_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/notifications")
def list_user_notifications(
    request: Request,
    telegram_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user = service.resolve_user(db, telegram_id, get_session_user(db, request))
    return {"ok": True, **service.list_notifications(db, user=user, telegram_id=telegram_id)}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    payload: NotificationReadIn,
    request: Request,
    db: Session = Depends(get_db),
):
    user = service.resolve_user(db, payload.telegram_id, get_session_user(db, request))
    if not service.mark_read(db, notification_id, user=user, telegram_id=payload.telegram_id):
        raise HTTPException(status_code=404, detail="notification_not_found")
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    payload: NotificationReadIn,
    request: Request,
    db: Session = Depends(get_db),
):
    user = service.resolve_user(db, payload.telegram_id, get_session_user(db, request))
    service.mark_all_read(db, user=user, telegram_id=payload.telegram_id)
    return {"ok": True}


@router.get("/admin/notifications")
def list_admin_notifications(admin_id: int, db: Session = Depends(get_db)):
    require_admin(admin_id)
    return {"ok": True, "notifications": service.list_admin_notifications(db)}


@router.post("/admin/notifications")
def create_admin_notification(payload: NotificationIn, db: Session = Depends(get_db)):
    require_admin(payload.admin_id)
    title = (payload.title or "").strip()
    message = (payload.message or "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="title_required")
    if not message:
        raise HTTPException(status_code=422, detail="message_required")
    schedule_mode = service.normalize_schedule_mode(payload.schedule_mode)
    repeat_hours = service.normalize_repeat_hours(payload.repeat_interval_hours)
    if schedule_mode == "scheduled" and not payload.scheduled_at:
        raise HTTPException(status_code=422, detail="scheduled_at_required")
    if schedule_mode == "repeat" and not repeat_hours:
        raise HTTPException(status_code=422, detail="repeat_interval_required")
    row = service.create_notification(
        db,
        category=payload.category,
        title=title,
        message=message,
        image_url=payload.image_url,
        link_url=payload.link_url,
        link_type=payload.link_type,
        schedule_mode=schedule_mode,
        scheduled_at=payload.scheduled_at,
        repeat_interval_hours=repeat_hours,
        max_send_count=payload.max_send_count,
        cooldown_hours=payload.cooldown_hours,
        is_enabled=payload.is_enabled,
    )
    return {"ok": True, "notification": service.serialize_notification(row)}
