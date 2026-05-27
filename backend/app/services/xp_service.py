from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.models import (
    FullMockResult,
    ListeningProgress,
    ReadingProgress,
    User,
    UserXP,
    VocabularyOddOneOutAttempt,
    WordShuffleSession,
    WritingProgress,
    SpeakingProgress,
    SpeakingResult,
    XPEvent,
    XPVisibilitySettings,
    ShadowWritingAttempt,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def resolve_user(db: Session, user_id: int | None = None, telegram_id: int | None = None) -> User | None:
    if user_id:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user:
            return user
    if telegram_id:
        return db.query(User).filter(User.telegram_id == int(telegram_id)).first()
    return None


def is_admin_identity(user: User | None = None, telegram_id: int | None = None) -> bool:
    if user and user.telegram_id and int(user.telegram_id) in ADMIN_IDS:
        return True
    return bool(telegram_id and int(telegram_id) in ADMIN_IDS)


def _xp_row(db: Session, user: User | None, telegram_id: int | None) -> UserXP:
    row = None
    if user:
        row = db.query(UserXP).filter(UserXP.user_id == user.id).first()
    if not row and telegram_id:
        row = db.query(UserXP).filter(UserXP.telegram_id == int(telegram_id)).first()
    if not row:
        row = UserXP(
            user_id=user.id if user else None,
            telegram_id=user.telegram_id if user and user.telegram_id else telegram_id,
            total_xp=0,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
        db.flush()
    elif user and not row.user_id:
        row.user_id = user.id
    if user and user.telegram_id and not row.telegram_id:
        row.telegram_id = user.telegram_id
    return row


def _identity_filters(user: User | None, telegram_id: int | None = None):
    filters = []
    if user:
        filters.append(UserXP.user_id == user.id)
        if user.telegram_id:
            filters.append(UserXP.telegram_id == int(user.telegram_id))
    if telegram_id:
        filters.append(UserXP.telegram_id == int(telegram_id))
    return filters


def _anon_seed(user: User | None, telegram_id: int | None = None) -> str:
    if user:
        return f"user:{user.id}"
    if telegram_id:
        return f"telegram:{int(telegram_id)}"
    return f"anon:{_utcnow().timestamp()}"


def _generate_public_anon_code(db: Session, user: User | None, telegram_id: int | None, current_id: int | None = None) -> str:
    seed = _anon_seed(user, telegram_id)
    base = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:10], 16) % 10000
    for offset in range(10000):
        code = f"{(base + offset) % 10000:04d}"
        existing = db.query(XPVisibilitySettings).filter(XPVisibilitySettings.public_anon_code == code).first()
        if not existing or (current_id and existing.id == current_id):
            return code
    return f"{base:04d}"


def add_xp(
    db: Session,
    user_id: int | None = None,
    telegram_id: int | None = None,
    amount: int = 0,
    source_type: str = "system_adjustment",
    reason: str = "manual_adjustment",
    related_attempt_id: int | None = None,
    related_session_id: int | None = None,
    meta: dict[str, Any] | None = None,
    event_key: str | None = None,
) -> XPEvent | None:
    amount = int(amount or 0)
    if amount <= 0:
        return None
    if event_key and db.query(XPEvent).filter(XPEvent.event_key == event_key).first():
        return None

    user = resolve_user(db, user_id=user_id, telegram_id=telegram_id)
    identity_telegram_id = int(user.telegram_id) if user and user.telegram_id else (int(telegram_id) if telegram_id else None)
    if not user and not identity_telegram_id:
        return None

    row = _xp_row(db, user, identity_telegram_id)
    row.total_xp = int(row.total_xp or 0) + amount
    row.updated_at = _utcnow()
    event = XPEvent(
        user_id=user.id if user else None,
        telegram_id=identity_telegram_id,
        amount=amount,
        source_type=source_type,
        reason=reason,
        related_attempt_id=related_attempt_id,
        related_session_id=related_session_id,
        event_key=event_key,
        meta=meta or {},
        created_at=_utcnow(),
    )
    db.add(event)
    db.add(row)
    db.commit()
    db.refresh(event)
    return event


def get_total_xp(db: Session, user_id: int | None = None, telegram_id: int | None = None) -> int:
    user = resolve_user(db, user_id=user_id, telegram_id=telegram_id)
    filters = _identity_filters(user, telegram_id)
    if not filters:
        return 0
    total = db.query(func.coalesce(func.sum(UserXP.total_xp), 0)).filter(or_(*filters)).scalar()
    return int(total or 0)


def get_xp_history(
    db: Session,
    user_id: int | None = None,
    telegram_id: int | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    user = resolve_user(db, user_id=user_id, telegram_id=telegram_id)
    filters = []
    if user:
        filters.append(XPEvent.user_id == user.id)
        if user.telegram_id:
            filters.append(XPEvent.telegram_id == int(user.telegram_id))
    elif telegram_id:
        filters.append(XPEvent.telegram_id == int(telegram_id))
    if not filters:
        return []
    rows = (
        db.query(XPEvent)
        .filter(or_(*filters))
        .order_by(XPEvent.created_at.desc())
        .limit(max(1, min(int(limit or 50), 100)))
        .all()
    )
    return [serialize_event(row) for row in rows]


def get_or_create_settings(db: Session, user: User | None, telegram_id: int | None = None) -> XPVisibilitySettings:
    row = None
    if user:
        row = db.query(XPVisibilitySettings).filter(XPVisibilitySettings.user_id == user.id).first()
    if not row and telegram_id:
        row = db.query(XPVisibilitySettings).filter(XPVisibilitySettings.telegram_id == int(telegram_id)).first()
    if not row:
        row = XPVisibilitySettings(
            user_id=user.id if user else None,
            telegram_id=user.telegram_id if user and user.telegram_id else telegram_id,
            public_anon_code=_generate_public_anon_code(db, user, telegram_id),
            show_full_name=False,
            show_full_username=True,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    elif not row.public_anon_code:
        row.public_anon_code = _generate_public_anon_code(db, user, telegram_id, current_id=row.id)
        row.updated_at = _utcnow()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_settings(
    db: Session,
    user: User | None,
    telegram_id: int | None,
    nickname: str | None,
    show_full_name: bool,
    show_full_username: bool,
) -> XPVisibilitySettings:
    row = get_or_create_settings(db, user, telegram_id)
    cleaned_nickname = (nickname or "").strip()[:40] or None
    if cleaned_nickname and nickname_taken(db, cleaned_nickname, user=user, telegram_id=telegram_id):
        raise ValueError("nickname_taken")
    row.nickname = cleaned_nickname
    row.show_full_name = bool(show_full_name)
    row.show_full_username = bool(show_full_username)
    row.updated_at = _utcnow()
    if user and not row.user_id:
        row.user_id = user.id
    if user and user.telegram_id and not row.telegram_id:
        row.telegram_id = user.telegram_id
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def nickname_taken(db: Session, nickname: str, user: User | None = None, telegram_id: int | None = None) -> bool:
    cleaned = (nickname or "").strip()
    if not cleaned:
        return False
    query = db.query(XPVisibilitySettings).filter(func.lower(XPVisibilitySettings.nickname) == cleaned.lower())
    existing = query.first()
    if not existing:
        return False
    if user and existing.user_id == user.id:
        return False
    if telegram_id and existing.telegram_id == int(telegram_id):
        return False
    return True


def mask_name(name: str | None) -> str:
    cleaned = " ".join(str(name or "").strip().split())
    if not cleaned:
        return "Learner"

    def mask_part(part: str) -> str:
        if len(part) <= 1:
            return "*"
        if len(part) == 2:
            return f"{part[0]}*"
        return f"{part[0]}{'*' * (len(part) - 2)}{part[-1]}"

    return " ".join(mask_part(part) for part in cleaned.split())


def get_display_name(user: User | None, settings: XPVisibilitySettings | None = None) -> str:
    if is_admin_identity(user):
        full_admin_name = " ".join(part for part in [getattr(user, "name", None), getattr(user, "surname", None)] if part).strip()
        return full_admin_name or getattr(user, "username", None) or getattr(user, "email", None) or "Admin"
    if settings and settings.nickname:
        return settings.nickname
    if user and user.username:
        username = str(user.username).lstrip("@")
        if not username:
            return "Learner"
        return f"@{username}" if not settings or settings.show_full_username else f"@{mask_name(username)}"
    full_name = " ".join(part for part in [getattr(user, "name", None), getattr(user, "surname", None)] if part).strip()
    if settings and settings.show_full_name and full_name:
        return full_name
    return mask_name(full_name or getattr(user, "email", None) or "Learner")


def get_public_leaderboard_name(user: User | None, settings: XPVisibilitySettings | None = None, telegram_id: int | None = None) -> str:
    return get_leaderboard_display_name(user, settings, telegram_id, viewer_is_admin=False)


def get_leaderboard_display_name(
    user: User | None,
    settings: XPVisibilitySettings | None = None,
    telegram_id: int | None = None,
    viewer_is_admin: bool = False,
) -> str:
    if settings and settings.nickname:
        return settings.nickname
    if user:
        full_name = " ".join(part for part in [getattr(user, "name", None), getattr(user, "surname", None)] if part).strip()
        if viewer_is_admin and full_name:
            return full_name
        if user.username and (viewer_is_admin or not settings or settings.show_full_username):
            return f"@{str(user.username).lstrip('@')}"
        if full_name:
            return full_name if viewer_is_admin else mask_name(full_name)
        if viewer_is_admin and user.email:
            return user.email
    code = (settings.public_anon_code if settings and settings.public_anon_code else None) or "0000"
    return f"Learner {str(code).zfill(4)[-4:]}"


def _leaderboard_identity_key(user: User | None, telegram_id: int | None) -> str | None:
    if user:
        return f"user:{user.id}"
    if telegram_id:
        return f"telegram:{int(telegram_id)}"
    return None


def get_leaderboard(
    db: Session,
    limit: int = 100,
    viewer_is_admin: bool = False,
    viewer_user: User | None = None,
    viewer_telegram_id: int | None = None,
) -> list[dict[str, Any]]:
    viewer_key = _leaderboard_identity_key(viewer_user, viewer_telegram_id)
    rows = (
        db.query(UserXP)
        .filter(UserXP.total_xp > 0)
        .order_by(UserXP.total_xp.desc(), UserXP.updated_at.asc())
        .all()
    )
    aggregated: dict[str, dict[str, Any]] = {}
    for row in rows:
        user = resolve_user(db, user_id=row.user_id, telegram_id=row.telegram_id)
        key = _leaderboard_identity_key(user, row.telegram_id)
        if not key:
            continue
        if key not in aggregated:
            aggregated[key] = {"user": user, "telegram_id": row.telegram_id, "total_xp": 0, "updated_at": row.updated_at}
        aggregated[key]["total_xp"] += int(row.total_xp or 0)
        if row.updated_at and (not aggregated[key]["updated_at"] or row.updated_at < aggregated[key]["updated_at"]):
            aggregated[key]["updated_at"] = row.updated_at

    sorted_rows = sorted(
        aggregated.values(),
        key=lambda item: (-int(item["total_xp"] or 0), item["updated_at"] or _utcnow()),
    )
    items: list[dict[str, Any]] = []
    rank_position = 0
    viewer_found = False
    for item in sorted_rows:
        user = item["user"]
        telegram_id = item["telegram_id"]
        if is_admin_identity(user, telegram_id):
            continue
        rank_position += 1
        settings = get_or_create_settings(db, user, telegram_id)
        is_current_user = bool(viewer_key and _leaderboard_identity_key(user, telegram_id) == viewer_key)
        viewer_found = viewer_found or is_current_user
        if len(items) >= limit and not is_current_user:
            continue
        items.append({
            "rank": rank_position,
            "display_name": get_leaderboard_display_name(user, settings, telegram_id, viewer_is_admin=viewer_is_admin),
            "xp": int(item["total_xp"] or 0),
            "is_current_user": is_current_user,
        })
        if len(items) >= limit and is_current_user:
            break
    if viewer_key and not viewer_found and not is_admin_identity(viewer_user, viewer_telegram_id):
        settings = get_or_create_settings(db, viewer_user, viewer_telegram_id)
        items.append({
            "rank": rank_position + 1,
            "display_name": get_leaderboard_display_name(
                viewer_user,
                settings,
                viewer_telegram_id,
                viewer_is_admin=viewer_is_admin,
            ),
            "xp": get_total_xp(
                db,
                user_id=viewer_user.id if viewer_user else None,
                telegram_id=viewer_telegram_id,
            ),
            "is_current_user": True,
        })
    return items


def serialize_event(event: XPEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "amount": int(event.amount or 0),
        "source_type": event.source_type,
        "reason": event.reason,
        "related_attempt_id": event.related_attempt_id,
        "related_session_id": event.related_session_id,
        "meta": event.meta or {},
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def serialize_settings(settings: XPVisibilitySettings) -> dict[str, Any]:
    return {
        "nickname": settings.nickname,
        "show_full_name": bool(settings.show_full_name),
        "show_full_username": bool(settings.show_full_username),
    }


def _grant_bundle(db: Session, user_id: int | None, telegram_id: int | None, source_type: str, related_attempt_id: int | None, related_session_id: int | None, grants: list[tuple[int, str, dict[str, Any] | None]]) -> int:
    created = 0
    for amount, reason, meta in grants:
        key_parts = [source_type, reason]
        if related_attempt_id:
            key_parts.append(f"attempt:{related_attempt_id}")
        if related_session_id:
            key_parts.append(f"session:{related_session_id}")
        event = add_xp(
            db,
            user_id=user_id,
            telegram_id=telegram_id,
            amount=amount,
            source_type=source_type,
            reason=reason,
            related_attempt_id=related_attempt_id,
            related_session_id=related_session_id,
            meta=meta,
            event_key=":".join(key_parts),
        )
        if event:
            created += 1
    return created


def award_shadow_writing_attempt(db: Session, attempt: ShadowWritingAttempt) -> None:
    seconds = int(attempt.time_seconds or 0)
    active_minutes = seconds / 60 if seconds > 0 else 0
    typed_chars = int(attempt.typed_chars or 0)
    accuracy = float(attempt.accuracy or 0)
    mistakes = int(attempt.mistakes_count or 0)
    wpm = (typed_chars / 5) / (seconds / 60) if seconds > 0 else 0
    grants: list[tuple[int, str, dict[str, Any] | None]] = []
    if active_minutes >= 3:
        grants.append((5, "shadow_live_typing_3_min", {"active_minutes": active_minutes}))
        extra = int((active_minutes - 3) // 3)
        if extra > 0:
            grants.append((extra * 3, "shadow_live_typing_next_3_min", {"blocks": extra}))
    if active_minutes >= 15:
        grants.append((20, "shadow_submission_15_min", None))
    elif active_minutes >= 10:
        grants.append((10, "shadow_submission_10_min", None))
    elif active_minutes >= 5:
        grants.append((5, "shadow_submission_5_min", None))
    if accuracy >= 80:
        if wpm >= 50:
            grants.append((10, "shadow_speed_50_wpm", {"wpm": wpm}))
        elif wpm >= 40:
            grants.append((8, "shadow_speed_40_wpm", {"wpm": wpm}))
        elif wpm >= 30:
            grants.append((5, "shadow_speed_30_wpm", {"wpm": wpm}))
        elif wpm >= 20:
            grants.append((3, "shadow_speed_20_wpm", {"wpm": wpm}))
    if accuracy >= 98:
        grants.append((20, "shadow_accuracy_98", {"accuracy": accuracy}))
    elif accuracy >= 95:
        grants.append((15, "shadow_accuracy_95", {"accuracy": accuracy}))
    elif accuracy >= 90:
        grants.append((10, "shadow_accuracy_90", {"accuracy": accuracy}))
    elif accuracy >= 80:
        grants.append((5, "shadow_accuracy_80", {"accuracy": accuracy}))
    if mistakes <= 5:
        grants.append((10, "shadow_mistakes_0_5", {"mistakes": mistakes}))
    elif mistakes <= 15:
        grants.append((5, "shadow_mistakes_6_15", {"mistakes": mistakes}))
    elif mistakes <= 30:
        grants.append((2, "shadow_mistakes_16_30", {"mistakes": mistakes}))
    if accuracy >= 70:
        if typed_chars >= 2000:
            grants.append((15, "shadow_typed_2000_chars", {"typed_chars": typed_chars}))
        elif typed_chars >= 1200:
            grants.append((10, "shadow_typed_1200_chars", {"typed_chars": typed_chars}))
        elif typed_chars >= 700:
            grants.append((5, "shadow_typed_700_chars", {"typed_chars": typed_chars}))
        elif typed_chars >= 300:
            grants.append((3, "shadow_typed_300_chars", {"typed_chars": typed_chars}))
    created = _grant_bundle(db, None, attempt.telegram_id, "shadow_writing", attempt.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, None, attempt.telegram_id, "shadow_writing", 0)
        db.commit()


def award_odd_one_out_attempt(db: Session, attempt: VocabularyOddOneOutAttempt) -> None:
    total_sets = int(attempt.total_sets_played or 0)
    correct = int(attempt.correct_answers or 0)
    best_streak = int(attempt.best_streak or 0)
    total_time = int(attempt.total_time_seconds or 0)
    avg_time = float(attempt.average_answer_time or 0)
    accuracy = (correct / total_sets * 100) if total_sets else 0
    grants: list[tuple[int, str, dict[str, Any] | None]] = []
    if total_time >= 180:
        grants.append((5, "odd_active_play_3_min", {"seconds": total_time}))
        extra = int((total_time - 180) // 180)
        if extra > 0:
            grants.append((extra * 3, "odd_active_play_next_3_min", {"blocks": extra}))
    for threshold, amount in [(40, 20), (20, 10), (10, 5), (5, 3)]:
        if total_sets >= threshold:
            grants.append((amount, f"odd_sets_{threshold}", {"sets": total_sets}))
            break
    for threshold, amount in [(100, 40), (50, 20), (25, 10), (10, 5)]:
        if correct >= threshold:
            grants.append((amount, f"odd_correct_{threshold}", {"correct": correct}))
            break
    for threshold, amount in [(20, 35), (15, 20), (10, 10), (5, 5), (3, 2)]:
        if best_streak >= threshold:
            grants.append((amount, f"odd_streak_{threshold}", {"best_streak": best_streak}))
            break
    for threshold, amount in [(95, 15), (90, 10), (80, 5), (70, 3)]:
        if accuracy >= threshold:
            grants.append((amount, f"odd_accuracy_{threshold}", {"accuracy": accuracy}))
            break
    if avg_time and avg_time < 3:
        grants.append((10, "odd_speed_under_3_sec", {"average_answer_time": avg_time}))
    elif avg_time and avg_time < 5:
        grants.append((5, "odd_speed_under_5_sec", {"average_answer_time": avg_time}))
    elif avg_time and avg_time < 8:
        grants.append((3, "odd_speed_under_8_sec", {"average_answer_time": avg_time}))
    created = _grant_bundle(db, attempt.user_id, attempt.telegram_id, "odd_one_out", attempt.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, attempt.user_id, attempt.telegram_id, "odd_one_out", 0)
        db.commit()


def award_word_shuffle_session(db: Session, session: WordShuffleSession) -> None:
    solved = int(session.solved_count or 0)
    best_streak = int(session.best_streak or 0)
    grants: list[tuple[int, str, dict[str, Any] | None]] = []
    if solved > 0:
        grants.append((solved * 2, "word_shuffle_solved_word", {"solved_count": solved}))
    for threshold, amount in [(20, 35), (15, 20), (10, 12), (5, 5), (3, 3)]:
        if best_streak >= threshold:
            grants.append((amount, f"word_shuffle_streak_{threshold}", {"best_streak": best_streak}))
            break
    for threshold, amount in [(40, 40), (20, 20), (10, 10), (5, 5)]:
        if solved >= threshold:
            grants.append((amount, f"word_shuffle_session_{threshold}", {"solved_count": solved}))
            break
    created = _grant_bundle(db, session.user_id, session.telegram_id, "word_shuffle", None, session.id, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, session.user_id, session.telegram_id, "word_shuffle", 0)
        db.commit()


def _band_bonus(prefix: str, band: float | None, table: list[tuple[float, int]]) -> tuple[int, str, dict[str, Any]] | None:
    if band is None:
        return None
    for threshold, amount in table:
        if float(band) >= threshold:
            return amount, f"{prefix}_band_{str(threshold).replace('.', '_')}", {"band": band}
    return None


def award_reading_completion(db: Session, progress: ReadingProgress) -> None:
    source = "full_mock" if progress.session_mode == "full_mock" else "single_mock"
    grants: list[tuple[int, str, dict[str, Any] | None]] = [(15 if source == "full_mock" else 20, "reading_completed", None)]
    bonus = _band_bonus("reading", progress.band_score, [(8.0, 40), (7.0, 30), (6.0, 20), (5.0, 10)])
    if source == "single_mock" and bonus:
        grants.append(bonus)
    created = _grant_bundle(db, progress.user_id, None, source, progress.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, progress.user_id, None, source, 0)
        db.commit()


def award_listening_completion(db: Session, progress: ListeningProgress) -> None:
    source = "full_mock" if progress.session_mode == "full_mock" else "single_mock"
    grants: list[tuple[int, str, dict[str, Any] | None]] = [(15 if source == "full_mock" else 20, "listening_completed", None)]
    bonus = _band_bonus("listening", progress.band_score, [(8.0, 40), (7.0, 30), (6.0, 20), (5.0, 10)])
    if source == "single_mock" and bonus:
        grants.append(bonus)
    created = _grant_bundle(db, None, progress.telegram_id, source, progress.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, None, progress.telegram_id, source, 0)
        gamification_service.record_listening_completion(db, None, progress.telegram_id)
        db.commit()


def award_writing_completion(db: Session, progress: WritingProgress) -> None:
    source = "full_mock" if progress.session_mode == "full_mock" else "single_mock"
    grants: list[tuple[int, str, dict[str, Any] | None]] = [(25 if source == "full_mock" else 35, "writing_completed", None)]
    band = progress.ai_overall_band
    if band is not None:
        if float(band) >= 8:
            grants.append((100, "writing_band_8", {"band": band}))
        elif float(band) >= 7:
            grants.append((50, "writing_band_7", {"band": band}))
        elif float(band) >= 6:
            grants.append((20, "writing_band_6", {"band": band}))
    created = _grant_bundle(db, None, progress.telegram_id, source, progress.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, None, progress.telegram_id, source, 0)
        db.commit()


def award_speaking_completion(db: Session, progress: SpeakingProgress) -> None:
    source = "full_mock" if progress.session_mode == "full_mock" else "single_mock"
    grants: list[tuple[int, str, dict[str, Any] | None]] = [(25 if source == "full_mock" else 35, "speaking_completed", None)]
    result = db.query(SpeakingResult).filter(SpeakingResult.progress_id == progress.id).first()
    band = result.overall_band if result else None
    if band is not None:
        if float(band) >= 8:
            grants.append((100, "speaking_band_8", {"band": band}))
        elif float(band) >= 7:
            grants.append((50, "speaking_band_7", {"band": band}))
        elif float(band) >= 6:
            grants.append((20, "speaking_band_6", {"band": band}))
    created = _grant_bundle(db, None, progress.telegram_id, source, progress.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, None, progress.telegram_id, source, 0)
        db.commit()


def award_full_mock_result(db: Session, result: FullMockResult) -> None:
    if result.status != "completed":
        return
    grants: list[tuple[int, str, dict[str, Any] | None]] = [
        (100, "full_mock_completion", None),
        (25, "writing_completed", None),
        (25, "speaking_completed", None),
        (30, "full_mock_no_abandon", None),
    ]
    band_bonus = _band_bonus("full_mock", result.overall_band, [(9.0, 400), (8.0, 200), (7.0, 120), (6.0, 70), (5.0, 40), (4.0, 20)])
    if band_bonus:
        grants.append(band_bonus)
    created = _grant_bundle(db, None, result.telegram_id, "full_mock", result.id, None, grants)
    from app.services import gamification_service

    if created:
        gamification_service.record_activity_from_xp(db, None, result.telegram_id, "full_mock", 0)
        db.commit()
