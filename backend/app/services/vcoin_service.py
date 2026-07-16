from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import User
from app.models_vcoins import CoinLedger


FULL_MOCK_COST = 10
SEPARATE_BLOCK_COST = 3


@dataclass(frozen=True)
class VCoinSpendResult:
    ok: bool
    telegram_id: int | None
    user_id: int | None
    balance: int
    required: int = 0
    reason: str = ""


def _positive_amount(amount: int) -> int:
    amount = int(amount or 0)
    if amount <= 0:
        raise HTTPException(status_code=422, detail="amount_must_be_positive")
    return amount


def _get_or_create_user_for_update(db: Session, telegram_id: int) -> User:
    user = (
        db.query(User)
        .filter(User.telegram_id == int(telegram_id))
        .with_for_update()
        .first()
    )
    if user:
        if user.v_coins is None:
            user.v_coins = 0
        return user

    user = User(telegram_id=int(telegram_id), v_coins=0)
    db.add(user)
    db.flush()
    return user


def _get_user_for_update(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .with_for_update()
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    if user.v_coins is None:
        user.v_coins = 0
    return user


def _legacy_telegram_filter(user: User):
    filters = [CoinLedger.user_id == int(user.id)]
    if user.telegram_id:
        filters.append(CoinLedger.telegram_id == int(user.telegram_id))
    return or_(*filters)


def get_balance(db: Session, telegram_id: int) -> int:
    user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
    if not user:
        return 0
    return int(user.v_coins or 0)


def get_balance_for_user(db: Session, user_id: int) -> int:
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        return 0
    return int(user.v_coins or 0)


def write_ledger(
    db: Session,
    telegram_id: int | None,
    delta: int,
    reason: str,
    reference_type: Optional[str],
    reference_id: Optional[str],
    balance_after: int,
    user_id: int | None = None,
) -> CoinLedger:
    entry = CoinLedger(
        user_id=int(user_id) if user_id is not None else None,
        telegram_id=int(telegram_id) if telegram_id is not None else None,
        delta=int(delta),
        reason=reason,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        balance_after=int(balance_after),
    )
    db.add(entry)
    db.flush()
    return entry


def get_recent_ledger(db: Session, telegram_id: int, limit: Optional[int] = None):
    query = (
        db.query(CoinLedger)
        .filter(CoinLedger.telegram_id == int(telegram_id))
        .order_by(CoinLedger.created_at.desc(), CoinLedger.id.desc())
    )
    if limit:
        query = query.limit(max(1, int(limit)))
    return query.all()


def get_recent_ledger_for_user(db: Session, user_id: int, limit: Optional[int] = None):
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        return []
    query = (
        db.query(CoinLedger)
        .filter(_legacy_telegram_filter(user))
        .order_by(CoinLedger.created_at.desc(), CoinLedger.id.desc())
    )
    if limit:
        query = query.limit(max(1, int(limit)))
    return query.all()


def has_spend_for_content(db: Session, telegram_id: int, content_type: str, reference_id) -> bool:
    return (
        db.query(CoinLedger.id)
        .filter(
            CoinLedger.telegram_id == int(telegram_id),
            CoinLedger.delta < 0,
            CoinLedger.reason == f"{content_type}_spend",
            CoinLedger.reference_type == content_type,
            CoinLedger.reference_id == str(reference_id),
        )
        .first()
        is not None
    )


def has_spend_for_content_for_user(db: Session, user: User, content_type: str, reference_id) -> bool:
    return (
        db.query(CoinLedger.id)
        .filter(
            _legacy_telegram_filter(user),
            CoinLedger.delta < 0,
            CoinLedger.reason == f"{content_type}_spend",
            CoinLedger.reference_type == content_type,
            CoinLedger.reference_id == str(reference_id),
        )
        .first()
        is not None
    )


def add_coins(
    db: Session,
    telegram_id: int,
    amount: int,
    reason: str,
    reference_type: Optional[str],
    reference_id: Optional[str],
) -> int:
    amount = _positive_amount(amount)
    user = _get_or_create_user_for_update(db, telegram_id)
    return add_coins_to_user(
        db=db,
        user=user,
        amount=amount,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
    )


def add_coins_to_user(
    db: Session,
    user: User,
    amount: int,
    reason: str,
    reference_type: Optional[str],
    reference_id: Optional[str],
) -> int:
    amount = _positive_amount(amount)
    user.v_coins = int(user.v_coins or 0) + amount
    db.add(user)
    db.flush()

    write_ledger(
        db=db,
        user_id=int(user.id),
        telegram_id=int(user.telegram_id) if user.telegram_id else None,
        delta=amount,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
        balance_after=user.v_coins,
    )
    return int(user.v_coins)


def spend_coins(
    db: Session,
    telegram_id: int,
    amount: int,
    reason: str,
    reference_type: Optional[str],
    reference_id: Optional[str],
) -> int:
    amount = _positive_amount(amount)
    user = _get_or_create_user_for_update(db, telegram_id)
    return spend_coins_for_user(
        db=db,
        user=user,
        amount=amount,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
    )


def spend_coins_for_user(
    db: Session,
    user: User,
    amount: int,
    reason: str,
    reference_type: Optional[str],
    reference_id: Optional[str],
) -> int:
    amount = _positive_amount(amount)
    current = int(user.v_coins or 0)

    if current < amount:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_vcoins",
                "required": amount,
                "balance": current,
            },
        )

    user.v_coins = current - amount
    db.add(user)
    db.flush()

    write_ledger(
        db=db,
        user_id=int(user.id),
        telegram_id=int(user.telegram_id) if user.telegram_id else None,
        delta=-amount,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
        balance_after=user.v_coins,
    )
    return int(user.v_coins)


def cost_for_content(content_type: str) -> int:
    if content_type == "full_mock":
        return FULL_MOCK_COST
    if content_type == "separate_block":
        return SEPARATE_BLOCK_COST
    raise HTTPException(status_code=422, detail="unknown_vcoin_content_type")


def require_vcoins_for_content(
    db: Session,
    telegram_id: int,
    content_type: str,
    reference_id,
    *,
    already_active: bool = False,
) -> VCoinSpendResult:
    user = _get_or_create_user_for_update(db, telegram_id)
    return require_vcoins_for_content_for_user(
        db=db,
        user=user,
        content_type=content_type,
        reference_id=reference_id,
        already_active=already_active,
    )


def require_vcoins_for_content_for_user(
    db: Session,
    user: User,
    content_type: str,
    reference_id,
    *,
    already_active: bool = False,
) -> VCoinSpendResult:
    cost = cost_for_content(content_type)
    balance = int(user.v_coins or 0)

    # Callers must set already_active=True only after they have found an existing
    # resumable attempt for this exact content. This prevents double charging on
    # refresh/resume without guessing about unrelated test-flow internals here.
    if already_active:
        return VCoinSpendResult(ok=True, telegram_id=user.telegram_id, user_id=user.id, balance=balance)

    balance_after = spend_coins_for_user(
        db=db,
        user=user,
        amount=cost,
        reason=f"{content_type}_spend",
        reference_type=content_type,
        reference_id=reference_id,
    )
    return VCoinSpendResult(ok=True, telegram_id=user.telegram_id, user_id=user.id, balance=balance_after, required=cost)


def spend_once_for_content(db: Session, telegram_id: int, content_type: str, reference_id) -> VCoinSpendResult:
    user = _get_or_create_user_for_update(db, telegram_id)
    return spend_once_for_content_for_user(db, user, content_type, reference_id)


def spend_once_for_content_for_user(db: Session, user: User, content_type: str, reference_id) -> VCoinSpendResult:
    cost = cost_for_content(content_type)
    reference = str(reference_id)
    reason = f"{content_type}_spend"
    user = _get_user_for_update(db, user.id)

    # Wallet-first purchases must be idempotent under double-clicks or refreshes:
    # lock the balance row, then re-check the ledger before deducting.
    if has_spend_for_content_for_user(db, user, content_type, reference):
        return VCoinSpendResult(
            ok=True,
            telegram_id=user.telegram_id,
            user_id=user.id,
            balance=int(user.v_coins or 0),
            required=cost,
            reason="already_paid",
        )

    current = int(user.v_coins or 0)
    if current < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_vcoins",
                "required": cost,
                "balance": current,
            },
        )

    user.v_coins = current - cost
    db.add(user)
    db.flush()
    write_ledger(
        db=db,
        user_id=int(user.id),
        telegram_id=int(user.telegram_id) if user.telegram_id else None,
        delta=-cost,
        reason=reason,
        reference_type=content_type,
        reference_id=reference,
        balance_after=user.v_coins,
    )
    return VCoinSpendResult(
        ok=True,
        telegram_id=user.telegram_id,
        user_id=user.id,
        balance=int(user.v_coins or 0),
        required=cost,
        reason="spent",
    )


def require_paid_access_or_spend(
    db: Session,
    telegram_id: int,
    content_type: str,
    reference_id,
    *,
    already_active: bool = False,
    full_mock_reference_id=None,
) -> VCoinSpendResult:
    user = _get_or_create_user_for_update(db, telegram_id)
    return require_paid_access_or_spend_for_user(
        db=db,
        user=user,
        content_type=content_type,
        reference_id=reference_id,
        already_active=already_active,
        full_mock_reference_id=full_mock_reference_id,
    )


def require_paid_access_or_spend_for_user(
    db: Session,
    user: User,
    content_type: str,
    reference_id,
    *,
    already_active: bool = False,
    full_mock_reference_id=None,
) -> VCoinSpendResult:
    if already_active:
        return VCoinSpendResult(
            ok=True,
            telegram_id=user.telegram_id,
            user_id=user.id,
            balance=int(user.v_coins or 0),
            reason="active_attempt",
        )

    if full_mock_reference_id is not None and has_spend_for_content_for_user(db, user, "full_mock", full_mock_reference_id):
        return VCoinSpendResult(
            ok=True,
            telegram_id=user.telegram_id,
            user_id=user.id,
            balance=int(user.v_coins or 0),
            reason="full_mock_paid",
        )

    if has_spend_for_content_for_user(db, user, content_type, reference_id):
        return VCoinSpendResult(
            ok=True,
            telegram_id=user.telegram_id,
            user_id=user.id,
            balance=int(user.v_coins or 0),
            reason="already_paid",
        )

    return spend_once_for_content_for_user(db, user, content_type, reference_id)
