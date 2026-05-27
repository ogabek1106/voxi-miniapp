from __future__ import annotations

import calendar
from datetime import date, datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Badge,
    MonthlyRewardRule,
    User,
    UserBadge,
    UserGamificationStats,
    UserMonthlyStreak,
    UserXP,
)


ACTIVITY_SOURCES = {"shadow_writing", "odd_one_out", "word_shuffle", "match_words", "single_mock", "full_mock"}
VOCABULARY_SOURCES = {"odd_one_out", "word_shuffle", "match_words"}


def _now() -> datetime:
    return datetime.utcnow()


def _today() -> date:
    return _now().date()


def get_month_length(year: int, month: int) -> int:
    return calendar.monthrange(int(year), int(month))[1]


def _completed_days(row: UserMonthlyStreak | None) -> list[int]:
    values = row.completed_days if row else []
    return sorted({int(day) for day in (values or []) if str(day).isdigit()})


def _claimed_milestones(row: UserMonthlyStreak | None) -> list[int]:
    values = row.claimed_milestones if row else []
    return sorted({int(day) for day in (values or []) if str(day).isdigit()})


def _serialize_badge(badge: Badge, unlocked: bool = False, unlocked_at: datetime | None = None, featured: bool = False) -> dict:
    return {
        "id": badge.id,
        "code": badge.code,
        "name": badge.name,
        "description": badge.description,
        "type": badge.type,
        "icon_url": badge.icon_url,
        "unlock_condition_type": badge.unlock_condition_type,
        "unlock_condition_value": badge.unlock_condition_value,
        "is_active": bool(badge.is_active),
        "sort_order": int(badge.sort_order or 0),
        "unlocked": bool(unlocked),
        "unlocked_at": unlocked_at.isoformat() if unlocked_at else None,
        "is_featured": bool(featured),
    }


def serialize_reward(rule: MonthlyRewardRule, completed_days: list[int] | None = None, claimed: list[int] | None = None) -> dict:
    completed_days = completed_days or []
    claimed = claimed or []
    return {
        "id": rule.id,
        "name": rule.name,
        "month_length": rule.month_length,
        "milestone_day": int(rule.milestone_day or 0),
        "reward_type": rule.reward_type,
        "reward_payload": rule.reward_payload or {},
        "chest_type": rule.chest_type,
        "is_active": bool(rule.is_active),
        "sort_order": int(rule.sort_order or 0),
        "claimable": int(rule.milestone_day or 0) in completed_days and int(rule.milestone_day or 0) not in claimed,
        "claimed": int(rule.milestone_day or 0) in claimed,
    }


def get_or_create_user_gamification_stats(db: Session, user_id: int) -> UserGamificationStats:
    row = db.query(UserGamificationStats).filter(UserGamificationStats.user_id == int(user_id)).first()
    if row:
        return row
    total_xp = db.query(func.coalesce(func.sum(UserXP.total_xp), 0)).filter(UserXP.user_id == int(user_id)).scalar() or 0
    row = UserGamificationStats(
        user_id=int(user_id),
        total_xp=int(total_xp or 0),
        current_streak_days=0,
        longest_streak_days=0,
        freeze_cards=0,
        vocabulary_activities_completed=0,
        listening_tasks_completed=0,
        shadow_writings_completed=0,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    db.flush()
    return row


def get_or_create_current_month_streak(db: Session, user_id: int) -> UserMonthlyStreak:
    today = _today()
    row = (
        db.query(UserMonthlyStreak)
        .filter(UserMonthlyStreak.user_id == int(user_id), UserMonthlyStreak.year == today.year, UserMonthlyStreak.month == today.month)
        .first()
    )
    if row:
        return row
    row = UserMonthlyStreak(
        user_id=int(user_id),
        year=today.year,
        month=today.month,
        completed_days=[],
        claimed_milestones=[],
        perfect_month_completed=False,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    db.flush()
    return row


def _recalculate_streak(stats: UserGamificationStats, month_row: UserMonthlyStreak) -> None:
    today = _today()
    days = set(_completed_days(month_row))
    current = 0
    cursor = today.day
    while cursor in days:
        current += 1
        cursor -= 1
    stats.current_streak_days = current
    stats.longest_streak_days = max(int(stats.longest_streak_days or 0), current, len(days))


def secure_today_streak(db: Session, user_id: int, source: str, xp_delta: int = 0) -> UserMonthlyStreak:
    stats = get_or_create_user_gamification_stats(db, user_id)
    row = get_or_create_current_month_streak(db, user_id)
    today = _today()
    days = set(_completed_days(row))
    if today.day not in days:
        days.add(today.day)
        row.completed_days = sorted(days)
        row.last_secured_date = today
        row.perfect_month_completed = len(days) == get_month_length(today.year, today.month)
    if xp_delta:
        stats.total_xp = int(stats.total_xp or 0) + int(xp_delta)
    _recalculate_streak(stats, row)
    row.updated_at = _now()
    stats.updated_at = _now()
    db.add(row)
    db.add(stats)
    return row


def record_activity_from_xp(db: Session, user_id: int | None, telegram_id: int | None, source_type: str, xp_delta: int = 0) -> None:
    if source_type not in ACTIVITY_SOURCES:
        return
    user = None
    if user_id:
        user = db.query(User).filter(User.id == int(user_id)).first()
    if not user and telegram_id:
        user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
    if not user:
        return
    secure_today_streak(db, user.id, source_type, xp_delta=xp_delta)
    stats = get_or_create_user_gamification_stats(db, user.id)
    if source_type in VOCABULARY_SOURCES:
        stats.vocabulary_activities_completed = int(stats.vocabulary_activities_completed or 0) + 1
    if source_type == "shadow_writing":
        stats.shadow_writings_completed = int(stats.shadow_writings_completed or 0) + 1
    if source_type in {"single_mock", "full_mock"}:
        # Reading/writing/speaking are not separated in existing XP sources yet; listening is handled below when the XP reason says so.
        pass
    stats.updated_at = _now()
    db.add(stats)
    evaluate_badges(db, user.id)


def record_listening_completion(db: Session, user_id: int | None, telegram_id: int | None) -> None:
    user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
    if not user and telegram_id:
        user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
    if not user:
        return
    stats = get_or_create_user_gamification_stats(db, user.id)
    stats.listening_tasks_completed = int(stats.listening_tasks_completed or 0) + 1
    stats.updated_at = _now()
    db.add(stats)


def _badge_condition_met(badge: Badge, stats: UserGamificationStats) -> bool:
    condition = badge.unlock_condition_type
    value = badge.unlock_condition_value
    if condition == "streak_days":
        return int(stats.current_streak_days or 0) >= int(value or 0)
    if condition == "xp_total":
        return int(stats.total_xp or 0) >= int(value or 0)
    if condition == "vocabulary_activities_completed":
        return int(stats.vocabulary_activities_completed or 0) >= int(value or 0)
    if condition == "listening_tasks_completed":
        return int(stats.listening_tasks_completed or 0) >= int(value or 0)
    if condition == "shadow_writings_completed":
        return int(stats.shadow_writings_completed or 0) >= int(value or 0)
    if condition == "early_launch_user":
        return True
    return False


def _leaderboard_rank(db: Session, user_id: int) -> int | None:
    total = db.query(func.coalesce(func.sum(UserXP.total_xp), 0)).filter(UserXP.user_id == int(user_id)).scalar() or 0
    if int(total or 0) <= 0:
        return None
    higher = (
        db.query(func.count(UserXP.id))
        .filter(UserXP.user_id.isnot(None), UserXP.total_xp > int(total))
        .scalar()
        or 0
    )
    return int(higher) + 1


def evaluate_badges(db: Session, user_id: int) -> list[UserBadge]:
    stats = get_or_create_user_gamification_stats(db, user_id)
    unlocked: list[UserBadge] = []
    for badge in db.query(Badge).filter(Badge.is_active.is_(True)).all():
        if badge.unlock_condition_type == "leaderboard_rank_top":
            rank = _leaderboard_rank(db, user_id)
            condition_met = bool(rank and rank <= int(badge.unlock_condition_value or 0))
        else:
            condition_met = _badge_condition_met(badge, stats)
        if not condition_met:
            continue
        existing = db.query(UserBadge).filter(UserBadge.user_id == int(user_id), UserBadge.badge_id == badge.id).first()
        if existing:
            unlocked.append(existing)
            continue
        row = UserBadge(user_id=int(user_id), badge_id=badge.id, unlocked_at=_now(), is_featured=False)
        db.add(row)
        db.flush()
        unlocked.append(row)
    featured = db.query(UserBadge).filter(UserBadge.user_id == int(user_id), UserBadge.is_featured.is_(True)).first()
    if not featured:
        first = (
            db.query(UserBadge)
            .join(Badge, Badge.id == UserBadge.badge_id)
            .filter(UserBadge.user_id == int(user_id))
            .order_by(Badge.sort_order.asc(), UserBadge.unlocked_at.asc())
            .first()
        )
        if first:
            first.is_featured = True
            db.add(first)
    return unlocked


def get_user_badges(db: Session, user_id: int) -> list[dict]:
    evaluate_badges(db, user_id)
    unlocked = {
        row.badge_id: row
        for row in db.query(UserBadge).filter(UserBadge.user_id == int(user_id)).all()
    }
    badges = db.query(Badge).filter(Badge.is_active.is_(True)).order_by(Badge.sort_order.asc(), Badge.id.asc()).all()
    return [_serialize_badge(badge, bool(unlocked.get(badge.id)), unlocked.get(badge.id).unlocked_at if unlocked.get(badge.id) else None, unlocked.get(badge.id).is_featured if unlocked.get(badge.id) else False) for badge in badges]


def get_current_featured_badge(db: Session, user_id: int) -> dict | None:
    evaluate_badges(db, user_id)
    row = (
        db.query(UserBadge, Badge)
        .join(Badge, Badge.id == UserBadge.badge_id)
        .filter(UserBadge.user_id == int(user_id), UserBadge.is_featured.is_(True), Badge.is_active.is_(True))
        .first()
    )
    if not row:
        row = (
            db.query(UserBadge, Badge)
            .join(Badge, Badge.id == UserBadge.badge_id)
            .filter(UserBadge.user_id == int(user_id), Badge.is_active.is_(True))
            .order_by(Badge.sort_order.asc(), UserBadge.unlocked_at.asc())
            .first()
        )
    if not row:
        return None
    user_badge, badge = row
    return _serialize_badge(badge, True, user_badge.unlocked_at, user_badge.is_featured)


def _monthly_rules(db: Session, month_length: int) -> list[MonthlyRewardRule]:
    return (
        db.query(MonthlyRewardRule)
        .filter(MonthlyRewardRule.is_active.is_(True))
        .filter((MonthlyRewardRule.month_length.is_(None)) | (MonthlyRewardRule.month_length == int(month_length)))
        .order_by(MonthlyRewardRule.milestone_day.asc(), MonthlyRewardRule.sort_order.asc(), MonthlyRewardRule.id.asc())
        .all()
    )


def get_monthly_reward_map(db: Session, user_id: int) -> dict:
    row = get_or_create_current_month_streak(db, user_id)
    length = get_month_length(row.year, row.month)
    completed = _completed_days(row)
    claimed = _claimed_milestones(row)
    rewards = [serialize_reward(rule, completed, claimed) for rule in _monthly_rules(db, length) if int(rule.milestone_day or 0) <= length]
    next_reward = next((reward for reward in rewards if not reward["claimed"] and int(reward["milestone_day"]) >= len(completed)), None)
    return {"rewards": rewards, "next_reward": next_reward}


def claim_monthly_reward(db: Session, user_id: int, milestone_day: int) -> dict:
    row = get_or_create_current_month_streak(db, user_id)
    completed = _completed_days(row)
    claimed = _claimed_milestones(row)
    milestone_day = int(milestone_day)
    if milestone_day not in completed:
        return {"ok": False, "detail": "milestone_not_completed"}
    if milestone_day in claimed:
        return {"ok": False, "detail": "reward_already_claimed"}
    length = get_month_length(row.year, row.month)
    rules = [rule for rule in _monthly_rules(db, length) if int(rule.milestone_day or 0) == milestone_day]
    if not rules:
        return {"ok": False, "detail": "reward_not_found"}

    user = db.query(User).filter(User.id == int(user_id)).first()
    stats = get_or_create_user_gamification_stats(db, user_id)
    applied: list[dict[str, Any]] = []
    for rule in rules:
        payload = rule.reward_payload or {}
        result = {"reward": serialize_reward(rule, completed, claimed), "status": "applied"}
        amount = int(payload.get("xp") or 0)
        if amount > 0:
            from app.services import xp_service

            event = xp_service.add_xp(
                db,
                user_id=user_id,
                telegram_id=user.telegram_id if user else None,
                amount=amount,
                source_type="monthly_reward",
                reason=f"monthly_reward_day_{milestone_day}",
                event_key=f"monthly_reward:{user_id}:{row.year}:{row.month}:{milestone_day}:{rule.id}",
                meta=payload,
            )
            result["xp_event_id"] = event.id if event else None
        if rule.reward_type == "xp":
            pass
        elif rule.reward_type == "vcoins":
            amount = int(payload.get("vcoins") or 0)
            if user and amount > 0:
                user.v_coins = int(user.v_coins or 0) + amount
                db.add(user)
        elif rule.reward_type == "freeze_card":
            amount = int(payload.get("freeze_cards") or 1)
            stats.freeze_cards = int(stats.freeze_cards or 0) + max(1, amount)
            db.add(stats)
        elif rule.reward_type == "badge":
            code = payload.get("badge_code")
            badge = db.query(Badge).filter(Badge.code == code, Badge.is_active.is_(True)).first() if code else None
            if badge and not db.query(UserBadge).filter(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id).first():
                db.add(UserBadge(user_id=user_id, badge_id=badge.id, unlocked_at=_now(), is_featured=False))
        else:
            result["status"] = "pending"
        applied.append(result)
    claimed.append(milestone_day)
    row.claimed_milestones = sorted(set(claimed))
    row.updated_at = _now()
    db.add(row)
    evaluate_badges(db, user_id)
    db.commit()
    return {"ok": True, "milestone_day": milestone_day, "applied": applied, "monthly": build_user_gamification_payload(db, user_id)["monthly"]}


def _danger_state(stats: UserGamificationStats, row: UserMonthlyStreak) -> bool:
    today = _today()
    if row.year != today.year or row.month != today.month:
        return False
    completed = set(_completed_days(row))
    if today.day in completed:
        return False
    return int(stats.current_streak_days or 0) > 0 or _now().hour >= 18


def build_user_gamification_payload(db: Session, user_id: int) -> dict:
    stats = get_or_create_user_gamification_stats(db, user_id)
    xp_total = db.query(func.coalesce(func.sum(UserXP.total_xp), 0)).filter(UserXP.user_id == int(user_id)).scalar() or 0
    if int(stats.total_xp or 0) != int(xp_total or 0):
        stats.total_xp = int(xp_total or 0)
        stats.updated_at = _now()
        db.add(stats)
        db.flush()
    row = get_or_create_current_month_streak(db, user_id)
    evaluate_badges(db, user_id)
    completed = _completed_days(row)
    claimed = _claimed_milestones(row)
    length = get_month_length(row.year, row.month)
    rewards = [serialize_reward(rule, completed, claimed) for rule in _monthly_rules(db, length) if int(rule.milestone_day or 0) <= length]
    next_reward = next((reward for reward in rewards if not reward["claimed"] and int(reward["milestone_day"]) >= len(completed)), None)
    today = _today()
    return {
        "current_badge": get_current_featured_badge(db, user_id),
        "badges": get_user_badges(db, user_id),
        "monthly": {
            "year": row.year,
            "month": row.month,
            "month_length": length,
            "completed_days": completed,
            "completed_count": len(completed),
            "today_secured": row.year == today.year and row.month == today.month and today.day in completed,
            "danger_state": _danger_state(stats, row),
            "next_reward": next_reward,
            "rewards": rewards,
        },
        "stats": {
            "total_xp": int(stats.total_xp or 0),
            "freeze_cards": int(stats.freeze_cards or 0),
            "current_streak_days": int(stats.current_streak_days or 0),
            "longest_streak_days": int(stats.longest_streak_days or 0),
            "vocabulary_activities_completed": int(stats.vocabulary_activities_completed or 0),
            "listening_tasks_completed": int(stats.listening_tasks_completed or 0),
            "shadow_writings_completed": int(stats.shadow_writings_completed or 0),
        },
    }


DEFAULT_BADGES = [
    ("first_flame", "First Flame", "3-day streak", "streak", "streak_days", 3, 10),
    ("officer", "Officer", "Reach 500 XP", "xp", "xp_total", 500, 20),
    ("commander", "Commander", "Reach 1500 XP", "xp", "xp_total", 1500, 30),
    ("vocabulary_beast", "Vocabulary Beast", "Complete 50 vocabulary activities", "vocabulary", "vocabulary_activities_completed", 50, 40),
    ("listening_hunter", "Listening Hunter", "Complete 10 listening tasks", "listening", "listening_tasks_completed", 10, 50),
    ("shadow_master", "Shadow Master", "Complete 30 shadow writings", "shadow", "shadow_writings_completed", 30, 60),
    ("top_10", "Top 10", "Reach the leaderboard top 10", "leaderboard", "leaderboard_rank_top", 10, 70),
    ("founder", "Founder", "Early launch user", "special", "early_launch_user", None, 80),
]


DEFAULT_REWARDS = [
    (None, 1, "Day 1 XP", "xp", {"xp": 20, "xp_boost_percent": 5, "xp_boost_hours": 12}, None, 10),
    (None, 3, "Day 3 XP", "xp", {"xp": 30, "xp_boost_percent": 10, "xp_boost_hours": 24}, None, 20),
    (None, 3, "Day 3 First Flame", "badge", {"badge_code": "first_flame"}, None, 21),
    (None, 7, "First Week XP", "xp", {"xp": 50, "xp_boost_percent": 20, "xp_boost_hours": 24}, None, 30),
    (None, 7, "First Week Freeze", "freeze_card", {"freeze_cards": 1}, "weekly", 31),
    (None, 7, "First Week Reading Ticket", "ticket", {"free_block": "reading_single"}, "weekly", 32),
    (None, 10, "Day 10 Officer Boost", "xp", {"xp": 50, "xp_boost_percent": 20, "xp_boost_hours": 24}, None, 40),
    (None, 14, "Day 14 Coupon", "coupon", {"xp": 70, "xp_boost_percent": 30, "xp_boost_hours": 24, "vcoin_coupon_percent": 20}, None, 50),
    (None, 20, "Day 20 Momentum", "xp", {"xp": 70, "xp_boost_percent": 30, "xp_boost_hours": 24}, None, 60),
    (28, 21, "Day 21 Writing Ticket", "ticket", {"free_block": "writing_single"}, None, 70),
    (28, 24, "Day 24 XP Boost", "xp", {"xp": 80, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 80),
    (28, 26, "Day 26 XP Boost", "xp", {"xp": 90, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 90),
    (28, 28, "Monthly Chest", "chest", {"xp": 100, "xp_boost_percent": 50, "xp_boost_hours": 48}, "monthly", 100),
    (30, 21, "Day 21 Writing Ticket", "ticket", {"free_block": "writing_single"}, None, 70),
    (30, 25, "Day 25 XP Boost", "xp", {"xp": 80, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 80),
    (30, 27, "Day 27 XP Boost", "xp", {"xp": 90, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 90),
    (30, 30, "Monthly Chest", "chest", {"xp": 100, "xp_boost_percent": 50, "xp_boost_hours": 48}, "monthly", 100),
    (31, 21, "Day 21 Writing Ticket", "ticket", {"free_block": "writing_single"}, None, 70),
    (31, 25, "Day 25 XP Boost", "xp", {"xp": 80, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 80),
    (31, 28, "Day 28 XP Boost", "xp", {"xp": 90, "xp_boost_percent": 40, "xp_boost_hours": 24}, None, 90),
    (31, 31, "Monthly Chest", "chest", {"xp": 100, "xp_boost_percent": 50, "xp_boost_hours": 48}, "monthly", 100),
]


def seed_default_badges(db: Session) -> None:
    for code, name, description, badge_type, condition, value, sort_order in DEFAULT_BADGES:
        badge = db.query(Badge).filter(Badge.code == code).first()
        if not badge:
            badge = Badge(code=code, created_at=_now())
        badge.name = name
        badge.description = description
        badge.type = badge_type
        badge.unlock_condition_type = condition
        badge.unlock_condition_value = value
        badge.sort_order = sort_order
        badge.is_active = True
        badge.updated_at = _now()
        db.add(badge)
    db.commit()


def seed_default_monthly_rewards(db: Session) -> None:
    for month_length, milestone_day, name, reward_type, payload, chest_type, sort_order in DEFAULT_REWARDS:
        reward = (
            db.query(MonthlyRewardRule)
            .filter(
                MonthlyRewardRule.name == name,
                MonthlyRewardRule.month_length == month_length,
                MonthlyRewardRule.milestone_day == milestone_day,
                MonthlyRewardRule.reward_type == reward_type,
            )
            .first()
        )
        if not reward:
            reward = MonthlyRewardRule(name=name, created_at=_now())
        reward.month_length = month_length
        reward.milestone_day = milestone_day
        reward.reward_type = reward_type
        reward.reward_payload = payload
        reward.chest_type = chest_type
        reward.sort_order = sort_order
        reward.is_active = True
        reward.updated_at = _now()
        db.add(reward)
    db.commit()
