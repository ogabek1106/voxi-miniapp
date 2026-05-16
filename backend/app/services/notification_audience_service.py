from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import AppActivitySession, User


LOW_BALANCE_CATEGORIES = {
    "low_balance",
    "subscription_warning",
}

INACTIVE_CATEGORIES = {
    "inactive_user",
    "return_reminder",
}

UNFINISHED_FEATURES = {
    "abandoned_activity": (),
    "unfinished_mock": ("mock", "ielts"),
    "unfinished_reading": ("reading",),
    "unfinished_listening": ("listening",),
    "unfinished_writing": ("writing",),
    "unfinished_speaking": ("speaking",),
}


@dataclass(frozen=True)
class AudienceResult:
    audience_type: str
    users: list[User]


def _now_for_sessions(sessions: list[AppActivitySession]) -> datetime:
    if any(session.last_seen and session.last_seen.tzinfo for session in sessions):
        return datetime.now(timezone.utc)
    return datetime.utcnow()


def _same_time_kind(value: datetime | None, boundary: datetime) -> datetime | None:
    if not value:
        return None
    if value.tzinfo and not boundary.tzinfo:
        return value.replace(tzinfo=None)
    if boundary.tzinfo and not value.tzinfo:
        return value.replace(tzinfo=timezone.utc)
    return value


def _registered_users(db: Session) -> list[User]:
    return (
        db.query(User)
        .filter((User.telegram_id.isnot(None)) | (User.email.isnot(None)) | (User.google_id.isnot(None)))
        .all()
    )


def _latest_sessions_by_user(db: Session) -> dict[int, AppActivitySession]:
    sessions = (
        db.query(AppActivitySession)
        .filter((AppActivitySession.user_id.isnot(None)) | (AppActivitySession.telegram_id.isnot(None)))
        .order_by(AppActivitySession.last_seen.desc(), AppActivitySession.id.desc())
        .all()
    )
    users = _registered_users(db)
    by_id = {int(user.id): user for user in users if user.id}
    by_tg = {int(user.telegram_id): user for user in users if user.telegram_id}
    latest: dict[int, AppActivitySession] = {}
    for session in sessions:
        user = by_id.get(int(session.user_id)) if session.user_id else None
        if not user and session.telegram_id:
            user = by_tg.get(int(session.telegram_id))
        if user and user.id and int(user.id) not in latest:
            latest[int(user.id)] = session
    return latest


def _inactive_users(db: Session, hours: int = 48) -> list[User]:
    users = _registered_users(db)
    latest = _latest_sessions_by_user(db)
    now = _now_for_sessions(list(latest.values()))
    boundary = now - timedelta(hours=hours)
    inactive: list[User] = []
    for user in users:
        session = latest.get(int(user.id))
        last_seen = _same_time_kind(session.last_seen if session else None, boundary)
        if not last_seen or last_seen < boundary:
            inactive.append(user)
    return inactive


def _abandoned_users(db: Session, keywords: tuple[str, ...]) -> list[User]:
    latest = _latest_sessions_by_user(db)
    sessions = list(latest.values())
    if not sessions:
        return []
    now = _now_for_sessions(sessions)
    stale_after = now - timedelta(minutes=15)
    recent_after = now - timedelta(days=7)
    users = _registered_users(db)
    by_id = {int(user.id): user for user in users if user.id}
    result: list[User] = []
    for user_id, session in latest.items():
        last_seen = _same_time_kind(session.last_seen, stale_after)
        if not last_seen or last_seen > stale_after or last_seen < recent_after:
            continue
        page = f"{session.current_page or ''} {session.last_feature_counted or ''}".lower()
        if keywords and not any(keyword in page for keyword in keywords):
            continue
        user = by_id.get(user_id)
        if user:
            result.append(user)
    return result


def resolve_audience(db: Session, category: str | None) -> AudienceResult:
    normalized = (category or "custom_manual_notification").strip().lower()
    if normalized in LOW_BALANCE_CATEGORIES:
        users = db.query(User).filter(User.v_coins <= 5).all()
        return AudienceResult("low_balance_users", users)
    if normalized in INACTIVE_CATEGORIES:
        return AudienceResult("inactive_users", _inactive_users(db))
    if normalized in UNFINISHED_FEATURES:
        return AudienceResult(f"{normalized}_users", _abandoned_users(db, UNFINISHED_FEATURES[normalized]))
    return AudienceResult("all", [])


def audience_label(audience_type: str | None) -> str:
    labels = {
        "all": "All users",
        "low_balance_users": "Low-balance users",
        "inactive_users": "Inactive users",
        "abandoned_activity_users": "Abandoned activity users",
        "unfinished_mock_users": "Unfinished mock users",
        "unfinished_reading_users": "Unfinished reading users",
        "unfinished_listening_users": "Unfinished listening users",
        "unfinished_writing_users": "Unfinished writing users",
        "unfinished_speaking_users": "Unfinished speaking users",
    }
    return labels.get(audience_type or "all", (audience_type or "all").replace("_", " ").title())
