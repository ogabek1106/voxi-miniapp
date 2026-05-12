from datetime import date, datetime, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import (
    AppActivitySession,
    FeatureUsageCounter,
    ReadingProgress,
    User,
    VocabularyOddOneOutAttempt,
    WordMergeSession,
    WordShuffleSession,
)

ONLINE_SECONDS = 90
IDLE_SECONDS = 300
GAME_FEATURES = {"word_shuffle", "word_merge", "odd_one_out", "shadow_writing"}


def record_heartbeat(db: Session, payload) -> AppActivitySession:
    now = datetime.utcnow()
    session = (
        db.query(AppActivitySession)
        .filter(AppActivitySession.session_key == payload.session_key)
        .first()
    )
    is_new = session is None
    if is_new:
        session = AppActivitySession(
            session_key=payload.session_key,
            visitor_key=payload.visitor_key,
            started_at=now,
        )
        db.add(session)

    feature = _normalize_feature(payload.current_page)
    should_count_feature = is_new or session.last_feature_counted != feature

    session.visitor_key = payload.visitor_key or session.visitor_key
    session.user_id = payload.user_id or session.user_id
    session.telegram_id = payload.telegram_id or session.telegram_id
    session.user_name = payload.user_name or session.user_name
    session.current_page = feature
    session.device_type = payload.device_type or session.device_type or "unknown"
    session.last_seen = now

    if should_count_feature:
        session.last_feature_counted = feature
        _increment_feature(db, feature, now.date())
        if is_new:
            _increment_feature(db, "sessions_opened", now.date())

    db.commit()
    db.refresh(session)
    return session


def build_dashboard(db: Session) -> dict:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    today = now.date()
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)
    idle_cutoff = now - timedelta(seconds=IDLE_SECONDS)

    sessions = db.query(AppActivitySession).all()
    online_sessions = [session for session in sessions if session.last_seen and session.last_seen >= online_cutoff]
    active_sessions = [session for session in sessions if session.last_seen and session.last_seen >= idle_cutoff]
    today_sessions = [session for session in sessions if session.started_at and session.started_at >= today_start]

    registered_today = db.query(User).filter(User.created_at >= today_start).count()
    registered_total = db.query(User).count()

    live_now = {
        "online_users": len(online_sessions),
        "active_miniapp_users": _count_by_device(online_sessions, "Telegram Mini App"),
        "active_gameplay_users": sum(1 for session in online_sessions if session.current_page in GAME_FEATURES),
        "active_reading_users": sum(1 for session in online_sessions if session.current_page == "reading_test"),
        "active_listening_users": sum(1 for session in online_sessions if session.current_page == "listening_test"),
    }

    all_time = {
        "total_unique_visitors": _distinct_count(sessions, "visitor_key"),
        "total_registered_users": registered_total,
        "total_sessions_opened": len(sessions),
        "total_games_played": _total_games_played(db),
        "total_reading_tests_started": db.query(ReadingProgress).count(),
        "total_reading_submissions": db.query(ReadingProgress).filter(ReadingProgress.is_submitted == True).count(),  # noqa: E712
    }

    today_stats = {
        "visitors_today": _distinct_count(today_sessions, "visitor_key"),
        "new_users_today": registered_today,
        "returning_users_today": _returning_visitors_today(sessions, today_start),
        "games_played_today": _games_played_today(db, today_start),
        "tests_started_today": db.query(ReadingProgress).filter(ReadingProgress.started_at >= today_start).count(),
        "average_session_duration_today": _average_duration(today_sessions, now),
    }

    return {
        "live_now": live_now,
        "all_time": all_time,
        "today": today_stats,
        "feature_usage": _feature_usage(db, today),
        "users": [_serialize_live_user(session, now, online_cutoff, idle_cutoff) for session in sorted(active_sessions, key=lambda item: item.last_seen or item.started_at, reverse=True)[:80]],
    }


def _normalize_feature(value: str | None) -> str:
    value = str(value or "unknown").strip().lower().replace("-", "_").replace(" ", "_")
    return value[:80] or "unknown"


def _increment_feature(db: Session, feature_name: str, usage_date: date) -> None:
    counter = (
        db.query(FeatureUsageCounter)
        .filter(
            FeatureUsageCounter.feature_name == feature_name,
            FeatureUsageCounter.usage_date == usage_date,
        )
        .first()
    )
    if not counter:
        counter = FeatureUsageCounter(feature_name=feature_name, usage_date=usage_date, count=0)
        db.add(counter)
    counter.count = int(counter.count or 0) + 1
    counter.updated_at = datetime.utcnow()


def _count_by_device(sessions: list[AppActivitySession], device_type: str) -> int:
    return sum(1 for session in sessions if session.device_type == device_type)


def _distinct_count(sessions: list[AppActivitySession], attr: str) -> int:
    return len({getattr(session, attr) for session in sessions if getattr(session, attr)})


def _returning_visitors_today(sessions: list[AppActivitySession], today_start: datetime) -> int:
    first_seen = {}
    today_visitors = set()
    for session in sessions:
        if not session.visitor_key or not session.started_at:
            continue
        first_seen[session.visitor_key] = min(first_seen.get(session.visitor_key, session.started_at), session.started_at)
        if session.started_at >= today_start:
            today_visitors.add(session.visitor_key)
    return len([visitor for visitor in today_visitors if first_seen.get(visitor) and first_seen[visitor] < today_start])


def _total_games_played(db: Session) -> int:
    return (
        db.query(WordShuffleSession).filter(WordShuffleSession.finished_at.isnot(None)).count()
        + db.query(WordMergeSession).filter(WordMergeSession.finished_at.isnot(None)).count()
        + db.query(VocabularyOddOneOutAttempt).count()
    )


def _games_played_today(db: Session, today_start: datetime) -> int:
    return (
        db.query(WordShuffleSession).filter(WordShuffleSession.finished_at >= today_start).count()
        + db.query(WordMergeSession).filter(WordMergeSession.finished_at >= today_start).count()
        + db.query(VocabularyOddOneOutAttempt).filter(VocabularyOddOneOutAttempt.completed_at >= today_start).count()
    )


def _average_duration(sessions: list[AppActivitySession], now: datetime) -> int:
    durations = [
        max(0, int(((session.last_seen or now) - session.started_at).total_seconds()))
        for session in sessions
        if session.started_at
    ]
    if not durations:
        return 0
    return int(sum(durations) / len(durations))


def _feature_usage(db: Session, today: date) -> list[dict]:
    rows = (
        db.query(
            FeatureUsageCounter.feature_name,
            func.sum(FeatureUsageCounter.count).label("total_count"),
            func.sum(case((FeatureUsageCounter.usage_date == today, FeatureUsageCounter.count), else_=0)).label("today_count"),
        )
        .group_by(FeatureUsageCounter.feature_name)
        .order_by(func.sum(FeatureUsageCounter.count).desc())
        .all()
    )
    return [
        {
            "feature": row.feature_name,
            "total": int(row.total_count or 0),
            "today": int(row.today_count or 0),
        }
        for row in rows
    ]


def _serialize_live_user(session: AppActivitySession, now: datetime, online_cutoff: datetime, idle_cutoff: datetime) -> dict:
    if session.last_seen and session.last_seen >= online_cutoff:
        status = "online"
    elif session.last_seen and session.last_seen >= idle_cutoff:
        status = "idle"
    else:
        status = "offline"
    return {
        "telegram_id": session.telegram_id,
        "user_name": session.user_name or (str(session.telegram_id) if session.telegram_id else "Visitor"),
        "current_page": session.current_page or "unknown",
        "device_type": session.device_type or "unknown",
        "status": status,
        "session_duration": max(0, int(((session.last_seen or now) - session.started_at).total_seconds())) if session.started_at else 0,
        "last_seen": session.last_seen.isoformat() if session.last_seen else None,
    }
