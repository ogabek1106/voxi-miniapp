from datetime import date, datetime, timezone, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    AppActivitySession,
    FeatureUsageCounter,
    ReadingProgress,
    User,
    MatchWordsSession,
    VocabularyOddOneOutAttempt,
    WordMergeSession,
    WordShuffleSession,
)

ONLINE_SECONDS = 90
IDLE_SECONDS = 300
GAME_FEATURES = {"word_shuffle", "word_merge", "odd_one_out", "shadow_writing", "match_words"}
PUBLIC_ACTIVITY_CATEGORIES = [
    {"key": "shadow_writing", "label": "Shadow Writing"},
    {"key": "odd_one_out", "label": "Odd One Out"},
    {"key": "word_shuffle", "label": "Word Shuffle"},
    {"key": "match_words", "label": "Match Words"},
    {"key": "ielts_mock_test", "label": "IELTS Mock Test"},
    {"key": "listening_test", "label": "Listening"},
    {"key": "reading_test", "label": "Reading"},
    {"key": "writing_test", "label": "Writing"},
    {"key": "speaking_test", "label": "Speaking"},
]
PUBLIC_ACTIVITY_ALIASES = {
    "shadow_writing": "shadow_writing",
    "odd_one_out": "odd_one_out",
    "word_shuffle": "word_shuffle",
    "match_words": "match_words",
    "ielts_mock_test": "ielts_mock_test",
    "full_mock": "ielts_mock_test",
    "full_mock_test": "ielts_mock_test",
    "reading_test": "reading_test",
    "reading": "reading_test",
    "writing_test": "writing_test",
    "writing": "writing_test",
    "speaking_test": "speaking_test",
    "speaking": "speaking_test",
    "listening_test": "listening_test",
    "listening": "listening_test",
}


def record_heartbeat(db: Session, payload) -> AppActivitySession:
    now = _utcnow()
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
    now = _utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today = now.date()
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)
    idle_cutoff = now - timedelta(seconds=IDLE_SECONDS)

    sessions = db.query(AppActivitySession).all()
    online_sessions = [session for session in sessions if _as_utc(session.last_seen) and _as_utc(session.last_seen) >= online_cutoff]
    active_sessions = [session for session in sessions if _as_utc(session.last_seen) and _as_utc(session.last_seen) >= idle_cutoff]
    recent_sessions = sorted(
        sessions,
        key=lambda item: _as_utc(item.last_seen) or _as_utc(item.started_at) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    today_sessions = [session for session in sessions if _as_utc(session.started_at) and _as_utc(session.started_at) >= today_start]

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
        "users": [_serialize_live_user(session, now, online_cutoff, idle_cutoff) for session in recent_sessions[:80]],
    }


def build_public_stats(db: Session) -> dict:
    now = _utcnow()
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)
    sessions = (
        db.query(AppActivitySession)
        .filter(AppActivitySession.last_seen >= online_cutoff)
        .all()
    )
    latest_by_person = {}

    for session in sessions:
        identity = _public_identity(session)
        if not identity:
            continue
        last_seen = _as_utc(session.last_seen) or datetime.min.replace(tzinfo=timezone.utc)
        previous = latest_by_person.get(identity)
        previous_seen = _as_utc(previous.last_seen) if previous else None
        if not previous or not previous_seen or last_seen >= previous_seen:
            latest_by_person[identity] = session

    counts = {item["key"]: 0 for item in PUBLIC_ACTIVITY_CATEGORIES}
    for session in latest_by_person.values():
        category = PUBLIC_ACTIVITY_ALIASES.get(_normalize_feature(session.current_page))
        if category in counts:
            counts[category] += 1

    categories = [
        {
            "key": item["key"],
            "label": item["label"],
            "value": counts[item["key"]],
        }
        for item in PUBLIC_ACTIVITY_CATEGORIES
    ]

    return {
        "live_users": sum(item["value"] for item in categories),
        "total_learners": db.query(User).count(),
        "categories": categories,
        "generated_at": now.isoformat(),
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
    counter.updated_at = _utcnow()


def _count_by_device(sessions: list[AppActivitySession], device_type: str) -> int:
    return sum(1 for session in sessions if session.device_type == device_type)


def _distinct_count(sessions: list[AppActivitySession], attr: str) -> int:
    return len({getattr(session, attr) for session in sessions if getattr(session, attr)})


def _public_identity(session: AppActivitySession) -> str:
    if session.user_id:
        return f"user:{session.user_id}"
    if session.telegram_id:
        return f"telegram:{session.telegram_id}"
    if session.visitor_key:
        return f"visitor:{session.visitor_key}"
    return f"session:{session.session_key}"


def _returning_visitors_today(sessions: list[AppActivitySession], today_start: datetime) -> int:
    first_seen = {}
    today_visitors = set()
    for session in sessions:
        if not session.visitor_key or not session.started_at:
            continue
        started_at = _as_utc(session.started_at)
        first_seen[session.visitor_key] = min(first_seen.get(session.visitor_key, started_at), started_at)
        if started_at >= today_start:
            today_visitors.add(session.visitor_key)
    return len([visitor for visitor in today_visitors if first_seen.get(visitor) and _as_utc(first_seen[visitor]) < today_start])


def _total_games_played(db: Session) -> int:
    return (
        db.query(WordShuffleSession).filter(WordShuffleSession.finished_at.isnot(None)).count()
        + db.query(WordMergeSession).filter(WordMergeSession.finished_at.isnot(None)).count()
        + db.query(VocabularyOddOneOutAttempt).count()
        + db.query(MatchWordsSession).filter(MatchWordsSession.finished_at.isnot(None)).count()
    )


def _games_played_today(db: Session, today_start: datetime) -> int:
    return (
        db.query(WordShuffleSession).filter(WordShuffleSession.finished_at >= today_start).count()
        + db.query(WordMergeSession).filter(WordMergeSession.finished_at >= today_start).count()
        + db.query(VocabularyOddOneOutAttempt).filter(VocabularyOddOneOutAttempt.completed_at >= today_start).count()
        + db.query(MatchWordsSession).filter(MatchWordsSession.finished_at >= today_start).count()
    )


def _average_duration(sessions: list[AppActivitySession], now: datetime) -> int:
    durations = [
        max(0, int(((_as_utc(session.last_seen) or now) - _as_utc(session.started_at)).total_seconds()))
        for session in sessions
        if _as_utc(session.started_at)
    ]
    if not durations:
        return 0
    return int(sum(durations) / len(durations))


def _feature_usage(db: Session, today: date) -> list[dict]:
    rows = db.query(FeatureUsageCounter).all()
    by_feature = {}
    for row in rows:
        feature = row.feature_name or "unknown"
        item = by_feature.setdefault(feature, {"feature": feature, "total": 0, "today": 0})
        count = int(row.count or 0)
        item["total"] += count
        if row.usage_date == today:
            item["today"] += count
    return [
        by_feature[key]
        for key in sorted(by_feature, key=lambda item: by_feature[item]["total"], reverse=True)
    ]


def _serialize_live_user(session: AppActivitySession, now: datetime, online_cutoff: datetime, idle_cutoff: datetime) -> dict:
    last_seen = _as_utc(session.last_seen)
    started_at = _as_utc(session.started_at)
    if last_seen and last_seen >= online_cutoff:
        status = "online"
    elif last_seen and last_seen >= idle_cutoff:
        status = "idle"
    else:
        status = "offline"
    return {
        "telegram_id": session.telegram_id,
        "user_name": session.user_name or (str(session.telegram_id) if session.telegram_id else "Visitor"),
        "current_page": session.current_page or "unknown",
        "device_type": session.device_type or "unknown",
        "status": status,
        "session_duration": max(0, int(((last_seen or now) - started_at).total_seconds())) if started_at else 0,
        "last_seen": last_seen.isoformat() if last_seen else None,
    }


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if not value:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
