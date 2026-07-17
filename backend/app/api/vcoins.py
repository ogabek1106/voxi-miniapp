import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models_vcoins import ManualBalanceAdjustment, PaymentRequest, VCoinPromoCode
from app.services.payment_pricing_service import (
    build_quote,
    create_payment_intent,
    get_payment_settings,
    normalize_scope,
    serialize_payment_request,
    update_exchange_rate,
)
from app.services.payment_service import (
    confirm_payment,
    create_payment_request,
    reject_payment,
)
from app.models import (
    ListeningProgress,
    ListeningTest,
    FullMockResult,
    ReadingProgress,
    ReadingTest,
    SpeakingProgress,
    SpeakingTest,
    User,
    WritingProgress,
    WritingTest,
)
from app.services.auth_service import get_session_user
from app.services.vcoin_service import (
    cost_for_content,
    get_balance,
    get_balance_for_user,
    get_recent_ledger,
    get_recent_ledger_for_user,
    has_spend_for_content_for_user,
    spend_once_for_content,
    spend_once_for_content_for_user,
)
from app.services.vcoin_admin_service import (
    apply_manual_balance_adjustment,
    search_users_for_manual_balance,
)


router = APIRouter(prefix="/vcoins", tags=["vcoins"])


class PaymentRequestIn(BaseModel):
    telegram_id: Optional[int] = None
    payment_token: Optional[str] = None
    package_code: Optional[str] = None
    coins: Optional[int] = None
    price: Optional[str] = None
    receipt_file_id: Optional[str] = None
    receipt_image_hash: Optional[str] = None
    submitted_at: Optional[str] = None

    class Config:
        extra = "allow"


class PaymentActionIn(BaseModel):
    admin_id: Optional[int] = None
    admin_telegram_id: Optional[int] = None
    reject_reason: Optional[str] = None
    reason: Optional[str] = None


class VCoinSpendIn(BaseModel):
    telegram_id: Optional[int] = None
    content_type: str
    reference_id: str


class VCoinAccessStatusIn(BaseModel):
    telegram_id: Optional[int] = None
    content_type: str
    reference_id: str
    full_mock_reference_id: Optional[str] = None


class PaymentQuoteIn(BaseModel):
    coins: int
    promo_code: Optional[str] = None


class PaymentIntentIn(BaseModel):
    telegram_id: int
    coins: int
    promo_code: Optional[str] = None


class ExchangeRateIn(BaseModel):
    admin_id: int
    exchange_rate_uzs: int


class PromoCodeIn(BaseModel):
    admin_id: int
    code: str
    scope: str = "vcoin"
    discount_percent: int
    is_active: bool = True
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None


class ManualBalanceAdjustmentIn(BaseModel):
    admin_id: int
    target_user_id: int
    action_type: str
    amount: int
    reason: str
    note: Optional[str] = None


def _bot_buy_link() -> Optional[str]:
    explicit = os.getenv("VOXI_BOT_BUY_LINK", "").strip()
    if explicit:
        return explicit

    username = os.getenv("VOXI_BOT_USERNAME", "").strip().lstrip("@")
    if not username:
        return None
    return f"https://t.me/{username}?start=buy_vcoin"


def _bot_payment_link(token: str) -> Optional[str]:
    explicit = os.getenv("VOXI_BOT_PAYMENT_BASE_LINK", "").strip()
    if explicit:
        if "{token}" in explicit:
            return explicit.replace("{token}", token)
        separator = "&" if "?" in explicit else "?"
        return f"{explicit}{separator}start=pay_{token}"

    username = os.getenv("VOXI_BOT_USERNAME", "").strip().lstrip("@") or "voxi_aibot"
    return f"https://t.me/{username}?start=pay_{token}"


def require_backend_token(authorization: str = Header(default="")):
    expected = os.getenv("VCOIN_BACKEND_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="vcoin_backend_token_not_configured")

    prefix = "Bearer "
    if not authorization.startswith(prefix) or authorization[len(prefix):] != expected:
        raise HTTPException(status_code=401, detail="invalid_vcoin_backend_token")


def require_admin_id(admin_id: int):
    if int(admin_id) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


def _resolve_wallet_user(db: Session, request: Request, telegram_id: int | None = None) -> User:
    session_user = get_session_user(db, request)
    if session_user:
        return session_user
    if telegram_id:
        user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
        if user:
            return user
    raise HTTPException(status_code=401, detail="authenticated_user_required")


def _serialize_datetime(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _latest_attempt_state(db: Session, user: User, content_type: str, reference_id: str, full_mock_reference_id: str | None = None) -> dict:
    section = ""
    raw_id = str(reference_id or "").strip()
    if content_type == "separate_block" and ":" in raw_id:
        section, raw_id = raw_id.split(":", 1)
    try:
        mock_id = int(full_mock_reference_id or raw_id)
    except Exception:
        return {"state": "payment_required"}

    telegram_id = int(user.telegram_id) if user.telegram_id else None
    mode = "full_mock" if content_type == "full_mock" or full_mock_reference_id else "single_block"
    progress = None

    if content_type == "full_mock":
        full_result = (
            db.query(FullMockResult)
            .filter(FullMockResult.mock_pack_id == mock_id, FullMockResult.user_id == user.id, FullMockResult.status == "completed")
            .order_by(FullMockResult.id.desc())
            .first()
        )
        if full_result:
            return {
                "state": "completed",
                "progress_id": full_result.id,
                "started_at": None,
                "submitted_at": _serialize_datetime(full_result.completed_at),
            }
        full_progress_rows = []
        reading_test = db.query(ReadingTest).filter(ReadingTest.mock_pack_id == mock_id).first()
        if reading_test:
            row = (
                db.query(ReadingProgress)
                .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == reading_test.id, ReadingProgress.session_mode == "full_mock")
                .order_by(ReadingProgress.id.desc())
                .first()
            )
            if row:
                full_progress_rows.append(row)
        if telegram_id:
            for model, test_model in (
                (ListeningProgress, ListeningTest),
                (WritingProgress, WritingTest),
                (SpeakingProgress, SpeakingTest),
            ):
                test_query = db.query(test_model)
                if hasattr(test_model, "mock_pack_id"):
                    test = test_query.filter(test_model.mock_pack_id == mock_id).first()
                else:
                    test = test_query.filter(test_model.id == mock_id).first()
                if not test:
                    continue
                row = (
                    db.query(model)
                    .filter(model.telegram_id == telegram_id, model.test_id == test.id, model.session_mode == "full_mock")
                    .order_by(model.id.desc())
                    .first()
                )
                if row:
                    full_progress_rows.append(row)
        if full_progress_rows:
            active = next((row for row in full_progress_rows if not row.is_submitted), None)
            progress = active or sorted(full_progress_rows, key=lambda row: row.id, reverse=True)[0]
            if progress and progress.is_submitted:
                return {
                    "state": "active",
                    "progress_id": progress.id,
                    "started_at": _serialize_datetime(progress.started_at),
                    "submitted_at": _serialize_datetime(progress.submitted_at),
                }
    elif section == "reading":
        test = db.query(ReadingTest).filter(ReadingTest.mock_pack_id == mock_id).first()
        if test:
            progress = (
                db.query(ReadingProgress)
                .filter(ReadingProgress.user_id == user.id, ReadingProgress.test_id == test.id, ReadingProgress.session_mode == mode)
                .order_by(ReadingProgress.id.desc())
                .first()
            )
    elif section == "listening" and telegram_id:
        test = db.query(ListeningTest).filter(ListeningTest.id == mock_id).first()
        if test:
            progress = (
                db.query(ListeningProgress)
                .filter(ListeningProgress.telegram_id == telegram_id, ListeningProgress.test_id == test.id, ListeningProgress.session_mode == mode)
                .order_by(ListeningProgress.id.desc())
                .first()
            )
    elif section == "writing" and telegram_id:
        test = db.query(WritingTest).filter(WritingTest.mock_pack_id == mock_id).first()
        if test:
            progress = (
                db.query(WritingProgress)
                .filter(WritingProgress.telegram_id == telegram_id, WritingProgress.test_id == test.id, WritingProgress.session_mode == mode)
                .order_by(WritingProgress.id.desc())
                .first()
            )
    elif section == "speaking" and telegram_id:
        test = db.query(SpeakingTest).filter(SpeakingTest.mock_pack_id == mock_id).first()
        if test:
            progress = (
                db.query(SpeakingProgress)
                .filter(SpeakingProgress.telegram_id == telegram_id, SpeakingProgress.test_id == test.id, SpeakingProgress.session_mode == mode)
                .order_by(SpeakingProgress.id.desc())
                .first()
            )

    if not progress:
        return {"state": "payment_required"}

    return {
        "state": "completed" if bool(progress.is_submitted) else "active",
        "progress_id": progress.id,
        "started_at": _serialize_datetime(progress.started_at),
        "submitted_at": _serialize_datetime(progress.submitted_at),
    }


def _parse_datetime(value: str | None):
    if not value:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    try:
        return timezone_datetime(cleaned)
    except Exception:
        raise HTTPException(status_code=422, detail="invalid_datetime")


def timezone_datetime(value: str):
    from datetime import datetime
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _serialize_promo(row: VCoinPromoCode) -> dict:
    return {
        "id": row.id,
        "code": row.code,
        "scope": normalize_scope(getattr(row, "scope", None)),
        "discount_percent": row.discount_percent,
        "is_active": bool(row.is_active),
        "expires_at": _serialize_datetime(row.expires_at),
        "usage_limit": row.usage_limit,
        "successful_uses": row.successful_uses or 0,
        "created_at": _serialize_datetime(row.created_at),
        "updated_at": _serialize_datetime(row.updated_at),
    }


def _serialize_quote(quote) -> dict:
    return {
        "coins": quote.coins,
        "exchange_rate_uzs": quote.exchange_rate_uzs,
        "subtotal_amount": quote.subtotal_amount,
        "promo_code": quote.promo_code,
        "discount_percent": quote.discount_percent,
        "discount_amount": quote.discount_amount,
        "final_amount": quote.final_amount,
    }


def _mark_expired_if_needed(db: Session, payment: PaymentRequest) -> PaymentRequest:
    if payment.status != "pending" or not payment.expires_at:
        return payment
    expires_at = payment.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at > datetime.now(timezone.utc):
        return payment
    payment.status = "expired"
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/payment-requests")
def create_vcoin_payment_request(
    payload: PaymentRequestIn,
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    data: Dict[str, Any] = payload.model_dump()
    payment = create_payment_request(db, data)
    duplicate = payment.status == "duplicate_suspected"
    return {
        "ok": True,
        "payment_id": payment.id,
        "status": payment.status,
        "duplicate_suspected": duplicate,
        "telegram_id": payment.telegram_id,
    }


@router.post("/quote")
def quote_vcoin_payment(payload: PaymentQuoteIn, db: Session = Depends(get_db)):
    quote = build_quote(db, payload.coins, payload.promo_code)
    return {"ok": True, "quote": _serialize_quote(quote)}


@router.post("/payment-intents")
def create_vcoin_payment_intent(payload: PaymentIntentIn, db: Session = Depends(get_db)):
    payment = create_payment_intent(
        db,
        telegram_id=payload.telegram_id,
        coins=payload.coins,
        promo_code=payload.promo_code,
    )
    data = serialize_payment_request(payment)
    data["bot_link"] = _bot_payment_link(payment.payment_token)
    return {"ok": True, "payment": data}


@router.get("/payment-intents/{payment_token}")
def get_payment_intent_by_token(
    payment_token: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    token = str(payment_token or "").strip().upper()
    payment = db.query(PaymentRequest).filter(PaymentRequest.payment_token == token).first()
    if not payment:
        raise HTTPException(status_code=404, detail="payment_token_not_found")
    payment = _mark_expired_if_needed(db, payment)
    return {"ok": True, "payment": serialize_payment_request(payment)}


@router.post("/payment-requests/{payment_id}/confirm")
def confirm_vcoin_payment(
    payment_id: int,
    payload: PaymentActionIn = Body(default_factory=PaymentActionIn),
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    admin_id = payload.admin_id if payload.admin_id is not None else payload.admin_telegram_id
    return confirm_payment(db, payment_id, admin_id=admin_id)


@router.post("/payment-requests/{payment_id}/reject")
def reject_vcoin_payment(
    payment_id: int,
    payload: PaymentActionIn = Body(default_factory=PaymentActionIn),
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    admin_id = payload.admin_id if payload.admin_id is not None else payload.admin_telegram_id
    reason = payload.reject_reason or payload.reason
    return reject_payment(db, payment_id, admin_id=admin_id, reason=reason)


@router.get("/balance")
def get_vcoin_balance(
    request: Request,
    telegram_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    user = _resolve_wallet_user(db, request, telegram_id)
    return {
        "user_id": user.id,
        "telegram_id": user.telegram_id,
        "v_coins": get_balance_for_user(db, user.id),
    }


@router.get("/buy-link")
def get_vcoin_buy_link():
    link = _bot_buy_link()
    return {
        "ok": bool(link),
        "url": link,
        "start_payload": "buy_vcoin",
    }


@router.get("/settings")
def get_vcoin_settings(db: Session = Depends(get_db)):
    settings = get_payment_settings(db)
    return {
        "ok": True,
        "exchange_rate_uzs": settings.exchange_rate_uzs,
        "updated_at": _serialize_datetime(settings.updated_at),
    }


@router.get("/admin/payment-settings")
def get_admin_payment_settings(admin_id: int, db: Session = Depends(get_db)):
    require_admin_id(admin_id)
    settings = get_payment_settings(db)
    return {
        "ok": True,
        "exchange_rate_uzs": settings.exchange_rate_uzs,
        "updated_at": _serialize_datetime(settings.updated_at),
    }


@router.post("/admin/payment-settings")
def update_admin_payment_settings(payload: ExchangeRateIn, db: Session = Depends(get_db)):
    require_admin_id(payload.admin_id)
    settings = update_exchange_rate(db, payload.exchange_rate_uzs)
    return {
        "ok": True,
        "exchange_rate_uzs": settings.exchange_rate_uzs,
        "updated_at": _serialize_datetime(settings.updated_at),
    }


@router.get("/admin/promo-codes")
def list_promo_codes(admin_id: int, db: Session = Depends(get_db)):
    require_admin_id(admin_id)
    rows = db.query(VCoinPromoCode).order_by(VCoinPromoCode.created_at.desc(), VCoinPromoCode.id.desc()).all()
    return {"ok": True, "promo_codes": [_serialize_promo(row) for row in rows]}


@router.post("/admin/promo-codes")
def save_promo_code(payload: PromoCodeIn, db: Session = Depends(get_db)):
    require_admin_id(payload.admin_id)
    code = str(payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=422, detail="promo_code_required")
    percent = int(payload.discount_percent or 0)
    if percent <= 0 or percent > 100:
        raise HTTPException(status_code=422, detail="discount_percent_must_be_1_100")
    scope = normalize_scope(payload.scope)
    row = db.query(VCoinPromoCode).filter(VCoinPromoCode.code == code).first()
    if not row:
        row = VCoinPromoCode(code=code)
    row.scope = scope
    row.discount_percent = percent
    row.is_active = bool(payload.is_active)
    row.expires_at = _parse_datetime(payload.expires_at)
    row.usage_limit = payload.usage_limit if payload.usage_limit and payload.usage_limit > 0 else None
    from datetime import datetime, timezone as dt_timezone
    row.updated_at = datetime.now(dt_timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "promo_code": _serialize_promo(row)}


@router.delete("/admin/promo-codes/{promo_id}")
def disable_promo_code(promo_id: int, admin_id: int, db: Session = Depends(get_db)):
    require_admin_id(admin_id)
    row = db.query(VCoinPromoCode).filter(VCoinPromoCode.id == int(promo_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="promo_code_not_found")
    row.is_active = False
    db.add(row)
    db.commit()
    return {"ok": True}


@router.get("/admin/users/search")
def search_admin_vcoin_users(
    admin_id: int,
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    require_admin_id(admin_id)
    return {
        "ok": True,
        "items": search_users_for_manual_balance(db, q),
    }


@router.post("/admin/manual-adjustments")
def create_manual_vcoin_adjustment(payload: ManualBalanceAdjustmentIn, db: Session = Depends(get_db)):
    require_admin_id(payload.admin_id)
    result = apply_manual_balance_adjustment(
        db,
        admin_telegram_id=payload.admin_id,
        target_user_id=payload.target_user_id,
        action_type=payload.action_type,
        amount=payload.amount,
        reason=payload.reason,
        note=payload.note,
    )
    db.commit()
    return result


@router.get("/ledger")
def get_vcoin_ledger(
    request: Request,
    telegram_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    user = _resolve_wallet_user(db, request, telegram_id)
    entries = get_recent_ledger_for_user(db, user.id, limit=limit)
    manual_ledger_ids = [int(item.id) for item in entries if item.reference_type == "manual_balance_adjustment"]
    manual_reference_ids = [
        int(item.reference_id)
        for item in entries
        if item.reference_type == "manual_balance_adjustment" and str(item.reference_id or "").isdigit()
    ]
    manual_notes_by_ledger_id = {}
    manual_notes_by_adjustment_id = {}
    if manual_ledger_ids or manual_reference_ids:
        adjustments = (
            db.query(ManualBalanceAdjustment)
            .filter(
                or_(
                    ManualBalanceAdjustment.ledger_id.in_(manual_ledger_ids or [-1]),
                    ManualBalanceAdjustment.id.in_(manual_reference_ids or [-1]),
                )
            )
            .all()
        )
        manual_notes_by_ledger_id = {int(item.ledger_id): item.note for item in adjustments if item.ledger_id and item.note}
        manual_notes_by_adjustment_id = {int(item.id): item.note for item in adjustments if item.id and item.note}
    return {
        "user_id": user.id,
        "telegram_id": user.telegram_id,
        "items": [
            {
                "id": item.id,
                "delta": item.delta,
                "reason": item.reason,
                "reference_type": item.reference_type,
                "reference_id": item.reference_id,
                "balance_after": item.balance_after,
                "created_at": _serialize_datetime(item.created_at),
                "note": manual_notes_by_ledger_id.get(int(item.id)) or (
                    manual_notes_by_adjustment_id.get(int(item.reference_id))
                    if item.reference_type == "manual_balance_adjustment" and str(item.reference_id or "").isdigit()
                    else None
                ),
            }
            for item in entries
        ],
    }


@router.post("/access-status")
def get_vcoin_access_status(payload: VCoinAccessStatusIn, request: Request, db: Session = Depends(get_db)):
    user = _resolve_wallet_user(db, request, payload.telegram_id)
    content_type = str(payload.content_type or "").strip()
    reference_id = str(payload.reference_id or "").strip()
    if not content_type or not reference_id:
        raise HTTPException(status_code=422, detail="content_type_and_reference_required")

    required = cost_for_content(content_type)
    balance = get_balance_for_user(db, user.id)
    full_mock_reference_id = str(payload.full_mock_reference_id or "").strip()
    attempt = _latest_attempt_state(db, user, content_type, reference_id, full_mock_reference_id or None)
    has_paid_not_started = has_spend_for_content_for_user(db, user, content_type, reference_id)
    if not has_paid_not_started and content_type == "full_mock":
        has_paid_not_started = has_spend_for_content_for_user(db, user, "full_mock", reference_id)
    attempt_state = attempt.get("state") or "payment_required"
    has_access = attempt_state in {"active", "completed"} or bool(has_paid_not_started)
    access_reason = attempt_state if attempt_state in {"active", "completed"} else ("paid_not_started" if has_paid_not_started else "")

    return {
        "ok": True,
        "user_id": user.id,
        "telegram_id": user.telegram_id,
        "content_type": content_type,
        "reference_id": reference_id,
        "required": required,
        "balance": balance,
        "missing": max(0, required - balance),
        "has_access": bool(has_access),
        "access_reason": access_reason,
        "attempt_state": attempt_state,
        "progress_id": attempt.get("progress_id"),
        "started_at": attempt.get("started_at"),
        "submitted_at": attempt.get("submitted_at"),
        "can_purchase": bool(has_access or balance >= required),
    }


@router.post("/spend")
def spend_vcoins(payload: VCoinSpendIn, request: Request, db: Session = Depends(get_db)):
    user = _resolve_wallet_user(db, request, payload.telegram_id)
    result = spend_once_for_content_for_user(db, user, payload.content_type, payload.reference_id)
    db.commit()
    return {
        "ok": True,
        "user_id": result.user_id,
        "telegram_id": result.telegram_id,
        "content_type": payload.content_type,
        "reference_id": str(payload.reference_id),
        "required": result.required,
        "balance": result.balance,
        "already_spent": result.reason == "already_paid",
        "reason": result.reason,
    }


@router.get("/balance/{telegram_id}")
def get_vcoin_balance_by_path(telegram_id: int, db: Session = Depends(get_db)):
    return {
        "telegram_id": int(telegram_id),
        "v_coins": get_balance(db, telegram_id),
        "balance": get_balance(db, telegram_id),
    }
