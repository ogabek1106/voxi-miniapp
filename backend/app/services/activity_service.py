from datetime import date, datetime, timezone, timedelta
import os
import random
import threading
from zoneinfo import ZoneInfo

from sqlalchemy import func, text
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


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)) or default)
    except (TypeError, ValueError):
        return default


PUBLIC_STATS_BOOST_ENABLED = os.getenv("PUBLIC_STATS_BOOST_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
PUBLIC_STATS_BOOST_MIN_INTERVAL_SECONDS = max(120, _env_int("PUBLIC_STATS_BOOST_MIN_INTERVAL_SECONDS", 120))
PUBLIC_STATS_BOOST_MAX_INTERVAL_SECONDS = max(
    PUBLIC_STATS_BOOST_MIN_INTERVAL_SECONDS,
    _env_int("PUBLIC_STATS_BOOST_MAX_INTERVAL_SECONDS", 300),
)
PUBLIC_STATS_BOOST_TIMEZONE = os.getenv("PUBLIC_STATS_BOOST_TIMEZONE", "Asia/Tashkent") or "Asia/Tashkent"
PUBLIC_TOTAL_BOOST_ENABLED = os.getenv("PUBLIC_TOTAL_BOOST_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
PUBLIC_TOTAL_BOOST_MIN_DAYS = max(1, _env_int("PUBLIC_TOTAL_BOOST_MIN_DAYS", 2))
PUBLIC_TOTAL_BOOST_MAX_DAYS = max(PUBLIC_TOTAL_BOOST_MIN_DAYS, _env_int("PUBLIC_TOTAL_BOOST_MAX_DAYS", 4))
PUBLIC_TOTAL_BOOST_MIN_INCREMENT = max(0, _env_int("PUBLIC_TOTAL_BOOST_MIN_INCREMENT", 2))
PUBLIC_TOTAL_BOOST_MAX_INCREMENT = max(PUBLIC_TOTAL_BOOST_MIN_INCREMENT, _env_int("PUBLIC_TOTAL_BOOST_MAX_INCREMENT", 8))
PUBLIC_TOTAL_BOOST_TIMEZONE = os.getenv("PUBLIC_TOTAL_BOOST_TIMEZONE", "Asia/Tashkent") or "Asia/Tashkent"
PUBLIC_STATS_BOOST_PROFILE = [
    ((0, 6), (0, 4)),
    ((6, 8), (2, 8)),
    ((8, 12), (8, 18)),
    ((12, 14), (15, 25)),
    ((14, 17), (10, 20)),
    ((17, 22), (18, 35)),
    ((22, 24), (5, 15)),
]
PUBLIC_STATS_FEATURE_WEIGHTS = {
    "ielts_mock_test": 24,
    "reading_test": 18,
    "listening_test": 14,
    "word_shuffle": 12,
    "match_words": 11,
    "odd_one_out": 8,
    "shadow_writing": 8,
    "writing_test": 6,
    "speaking_test": 5,
}
_PUBLIC_STATS_BOOST_LOCK = threading.Lock()
_PUBLIC_STATS_BOOST_STATE = {
    "sessions": [],
    "target": 0,
    "target_period": None,
    "target_refresh_at": None,
    "next_update_at": None,
    "last_update_at": None,
    "direction": 0,
    "daily_variation_date": None,
    "daily_variation": 1.0,
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
    if PUBLIC_STATS_BOOST_ENABLED:
        categories = _apply_public_stats_boost(categories, now)

    real_total_learners = db.query(User).count()
    public_total_learners = _public_total_explorers(db, real_total_learners, now)

    return {
        "live_users": sum(item["value"] for item in categories),
        "total_learners": public_total_learners,
        "categories": categories,
        "generated_at": now.isoformat(),
    }


def _public_total_explorers(db: Session, real_total: int, now: datetime) -> int:
    if not PUBLIC_TOTAL_BOOST_ENABLED:
        return real_total
    row = _ensure_public_total_boost_state(db, now)
    next_growth_at = _as_utc(row["next_growth_at"])
    if next_growth_at and now >= next_growth_at:
        increment = _public_total_growth_increment(_to_public_total_tz(now))
        growth_offset = max(0, int(row["growth_offset"] or 0)) + increment
        db.execute(
            text(
                "UPDATE public_stats_total_boost_state "
                "SET growth_offset = :growth_offset, "
                "last_growth_at = :last_growth_at, "
                "next_growth_at = :next_growth_at, "
                "last_increment_amount = :last_increment_amount, "
                "updated_at = :updated_at "
                "WHERE id = 1"
            ),
            {
                "growth_offset": growth_offset,
                "last_growth_at": now,
                "next_growth_at": _next_public_total_growth_at(now),
                "last_increment_amount": increment,
                "updated_at": now,
            },
        )
        db.commit()
        return real_total + growth_offset
    return real_total + max(0, int(row["growth_offset"] or 0))


def _ensure_public_total_boost_state(db: Session, now: datetime):
    row = db.execute(text("SELECT * FROM public_stats_total_boost_state WHERE id = 1")).mappings().first()
    if row:
        return row
    db.execute(
        text(
            "INSERT INTO public_stats_total_boost_state "
            "(id, growth_offset, last_growth_at, next_growth_at, last_increment_amount, updated_at) "
            "VALUES (1, 0, NULL, :next_growth_at, 0, :updated_at)"
        ),
        {
            "next_growth_at": _next_public_total_growth_at(now),
            "updated_at": now,
        },
    )
    db.commit()
    return db.execute(text("SELECT * FROM public_stats_total_boost_state WHERE id = 1")).mappings().first()


def _public_total_growth_increment(tashkent_now: datetime) -> int:
    weekday = tashkent_now.weekday()
    if weekday <= 2:
        low, high = max(PUBLIC_TOTAL_BOOST_MIN_INCREMENT, 2), min(PUBLIC_TOTAL_BOOST_MAX_INCREMENT, 5)
    elif weekday <= 5:
        low, high = max(PUBLIC_TOTAL_BOOST_MIN_INCREMENT, 4), PUBLIC_TOTAL_BOOST_MAX_INCREMENT
    else:
        low, high = 0, min(PUBLIC_TOTAL_BOOST_MAX_INCREMENT, 3)
    if high < low:
        low, high = PUBLIC_TOTAL_BOOST_MIN_INCREMENT, PUBLIC_TOTAL_BOOST_MAX_INCREMENT
    return random.randint(low, high)


def _next_public_total_growth_at(now: datetime) -> datetime:
    days = random.randint(PUBLIC_TOTAL_BOOST_MIN_DAYS, PUBLIC_TOTAL_BOOST_MAX_DAYS)
    tashkent_then = _to_public_total_tz(now) + timedelta(days=days)
    scheduled = tashkent_then.replace(
        hour=random.randint(9, 21),
        minute=random.randint(0, 59),
        second=0,
        microsecond=0,
    )
    return scheduled.astimezone(timezone.utc)


def _to_public_total_tz(value: datetime) -> datetime:
    try:
        tz = ZoneInfo(PUBLIC_TOTAL_BOOST_TIMEZONE)
    except Exception:
        tz = ZoneInfo("Asia/Tashkent")
    return _as_utc(value).astimezone(tz)


def _apply_public_stats_boost(categories: list[dict], now: datetime) -> list[dict]:
    real_counts = {item["key"]: int(item["value"] or 0) for item in categories}
    real_total = sum(real_counts.values())
    with _PUBLIC_STATS_BOOST_LOCK:
        _advance_public_stats_boost(real_total, now)
        simulated_counts = {item["key"]: 0 for item in PUBLIC_ACTIVITY_CATEGORIES}
        for session in _PUBLIC_STATS_BOOST_STATE["sessions"]:
            feature = session.get("feature")
            if feature in simulated_counts:
                simulated_counts[feature] += 1

    return [
        {
            **item,
            "value": real_counts[item["key"]] + simulated_counts.get(item["key"], 0),
        }
        for item in categories
    ]


def _advance_public_stats_boost(real_total: int, now: datetime) -> None:
    state = _PUBLIC_STATS_BOOST_STATE
    if state["next_update_at"] and now < state["next_update_at"]:
        return

    tashkent_now = _to_public_stats_tz(now)
    period_key, target_range = _public_stats_period(tashkent_now)
    _ensure_public_stats_daily_variation(tashkent_now)

    target_refresh_due = not state["target_refresh_at"] or now >= state["target_refresh_at"]
    if state["target_period"] != period_key or target_refresh_due:
        state["target"] = _pick_public_stats_target(target_range, state["daily_variation"])
        state["target_period"] = period_key
        state["target_refresh_at"] = now + timedelta(minutes=random.randint(20, 45))

    sessions = state["sessions"]
    desired_simulated = max(0, int(state["target"] or 0) - int(real_total or 0))
    current_simulated = len(sessions)
    delta = desired_simulated - current_simulated
    expired_indexes = [
        index
        for index, session in enumerate(sessions)
        if _as_utc(session.get("expires_at")) and _as_utc(session.get("expires_at")) <= now
    ]

    if delta > 0:
        add_count = min(delta, _public_stats_step_size(delta))
        sessions.extend(_new_public_stats_session(now) for _ in range(add_count))
        state["direction"] = 1 if add_count else state["direction"]
    elif delta < 0 or expired_indexes:
        remove_count = min(abs(delta) if delta < 0 else len(expired_indexes), _public_stats_step_size(delta or -len(expired_indexes)))
        _remove_public_stats_sessions(sessions, expired_indexes, remove_count)
        state["direction"] = -1 if remove_count else state["direction"]
    else:
        state["direction"] = 0

    state["last_update_at"] = now
    state["next_update_at"] = now + timedelta(seconds=random.randint(
        PUBLIC_STATS_BOOST_MIN_INTERVAL_SECONDS,
        PUBLIC_STATS_BOOST_MAX_INTERVAL_SECONDS,
    ))


def _to_public_stats_tz(value: datetime) -> datetime:
    try:
        tz = ZoneInfo(PUBLIC_STATS_BOOST_TIMEZONE)
    except Exception:
        tz = ZoneInfo("Asia/Tashkent")
    return _as_utc(value).astimezone(tz)


def _public_stats_period(value: datetime) -> tuple[str, tuple[int, int]]:
    hour = int(value.hour)
    for (start_hour, end_hour), target_range in PUBLIC_STATS_BOOST_PROFILE:
        if start_hour <= hour < end_hour:
            return f"{start_hour:02d}-{end_hour:02d}", target_range
    return "00-06", (0, 4)


def _ensure_public_stats_daily_variation(tashkent_now: datetime) -> None:
    state = _PUBLIC_STATS_BOOST_STATE
    today = tashkent_now.date().isoformat()
    if state["daily_variation_date"] == today:
        return
    rng = random.Random(f"public-stats:{today}")
    state["daily_variation_date"] = today
    state["daily_variation"] = rng.uniform(0.85, 1.15)
    state["target_refresh_at"] = None


def _pick_public_stats_target(target_range: tuple[int, int], variation: float) -> int:
    low, high = target_range
    varied_low = max(0, int(round(low * variation)))
    varied_high = max(varied_low, int(round(high * variation)))
    return random.randint(varied_low, varied_high)


def _public_stats_step_size(delta: int) -> int:
    magnitude = abs(int(delta or 0))
    if magnitude <= 0:
        return 0
    if magnitude == 1:
        return 1
    if magnitude <= 4:
        return min(2, magnitude)
    return min(magnitude, 3 if random.random() < 0.18 else 2)


def _new_public_stats_session(now: datetime) -> dict:
    lifetime_minutes = random.randint(10, 20) if random.random() < 0.16 else random.randint(2, 10)
    return {
        "id": f"display_{int(now.timestamp())}_{random.randint(100000, 999999)}",
        "feature": _weighted_public_stats_feature(),
        "created_at": now,
        "expires_at": now + timedelta(minutes=lifetime_minutes),
    }


def _weighted_public_stats_feature() -> str:
    keys = [item["key"] for item in PUBLIC_ACTIVITY_CATEGORIES]
    weights = [PUBLIC_STATS_FEATURE_WEIGHTS.get(key, 1) for key in keys]
    return random.choices(keys, weights=weights, k=1)[0]


def _remove_public_stats_sessions(sessions: list[dict], expired_indexes: list[int], remove_count: int) -> None:
    if remove_count <= 0 or not sessions:
        return
    remove_indexes = []
    for index in expired_indexes:
        if index not in remove_indexes:
            remove_indexes.append(index)
        if len(remove_indexes) >= remove_count:
            break
    while len(remove_indexes) < remove_count and len(remove_indexes) < len(sessions):
        oldest_index = min(
            (index for index in range(len(sessions)) if index not in remove_indexes),
            key=lambda index: _as_utc(sessions[index].get("expires_at")) or datetime.max.replace(tzinfo=timezone.utc),
        )
        remove_indexes.append(oldest_index)

    for index in sorted(remove_indexes, reverse=True):
        if 0 <= index < len(sessions):
            sessions.pop(index)


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
