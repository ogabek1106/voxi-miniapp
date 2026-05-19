from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import User
from app.models_vcoins import ManualBalanceAdjustment
from app.services.vcoin_service import write_ledger


VALID_MANUAL_REASONS = {
    "payment correction",
    "refund",
    "bonus",
    "compensation",
    "admin adjustment",
    "abuse correction",
    "other",
}


def _safe_int(value: Any) -> Optional[int]:
    try:
        if value is None or str(value).strip() == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def serialize_admin_user(user: User) -> Dict[str, Any]:
    name_parts = [str(user.name or "").strip(), str(user.surname or "").strip()]
    full_name = " ".join(part for part in name_parts if part).strip()
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "email": user.email,
        "name": user.name,
        "surname": user.surname,
        "full_name": full_name or user.email or (f"User #{user.id}" if user.id else "Unknown user"),
        "username": user.username,
        "photo_url": user.photo_url,
        "v_coins": int(user.v_coins or 0),
    }


def search_users_for_manual_balance(db: Session, query: str, limit: int = 12) -> List[Dict[str, Any]]:
    cleaned = str(query or "").strip()
    if len(cleaned) < 2:
        return []

    filters = []
    numeric = _safe_int(cleaned)
    if numeric is not None:
        filters.extend([
            User.id == numeric,
            User.telegram_id == numeric,
        ])

    like = f"%{cleaned}%"
    filters.extend([
        User.email.ilike(like),
        User.username.ilike(like),
        User.name.ilike(like),
        User.surname.ilike(like),
        (User.name + " " + User.surname).ilike(like),
    ])

    users = (
        db.query(User)
        .filter(or_(*filters))
        .order_by(User.id.desc())
        .limit(max(1, min(int(limit or 12), 25)))
        .all()
    )
    return [serialize_admin_user(user) for user in users]


def apply_manual_balance_adjustment(
    db: Session,
    *,
    admin_telegram_id: int,
    target_user_id: int,
    action_type: str,
    amount: int,
    reason: str,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    action = str(action_type or "").strip().lower()
    if action not in {"add", "remove"}:
        raise HTTPException(status_code=422, detail="invalid_manual_balance_action")

    coins = int(amount or 0)
    if coins <= 0:
        raise HTTPException(status_code=422, detail="amount_must_be_positive")

    cleaned_reason = str(reason or "").strip().lower()
    if not cleaned_reason:
        raise HTTPException(status_code=422, detail="reason_required")
    if cleaned_reason not in VALID_MANUAL_REASONS:
        raise HTTPException(status_code=422, detail="invalid_reason")

    user = (
        db.query(User)
        .filter(User.id == int(target_user_id))
        .with_for_update()
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    before = int(user.v_coins or 0)
    delta = coins if action == "add" else -coins
    after = before + delta
    if after < 0:
        raise HTTPException(status_code=422, detail="balance_cannot_be_negative")

    user.v_coins = after
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    db.flush()

    adjustment = ManualBalanceAdjustment(
        target_user_id=int(user.id),
        target_telegram_id=int(user.telegram_id) if user.telegram_id is not None else None,
        admin_telegram_id=int(admin_telegram_id),
        action_type=action,
        amount=coins,
        balance_before=before,
        balance_after=after,
        reason=cleaned_reason,
        note=str(note or "").strip() or None,
    )
    db.add(adjustment)
    db.flush()

    ledger = None
    if user.telegram_id is not None:
        ledger = write_ledger(
            db=db,
            telegram_id=int(user.telegram_id),
            delta=delta,
            reason=f"manual_{action}",
            reference_type="manual_balance_adjustment",
            reference_id=adjustment.id,
            balance_after=after,
        )
        adjustment.ledger_id = ledger.id
        db.add(adjustment)
        db.flush()

    return {
        "ok": True,
        "user": serialize_admin_user(user),
        "adjustment": {
            "id": adjustment.id,
            "target_user_id": adjustment.target_user_id,
            "target_telegram_id": adjustment.target_telegram_id,
            "admin_telegram_id": adjustment.admin_telegram_id,
            "action_type": adjustment.action_type,
            "amount": adjustment.amount,
            "balance_before": adjustment.balance_before,
            "balance_after": adjustment.balance_after,
            "reason": adjustment.reason,
            "note": adjustment.note,
            "ledger_id": adjustment.ledger_id,
            "created_at": adjustment.created_at.isoformat() if adjustment.created_at else None,
        },
    }
