import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models_vcoins import PaymentRequest, VCoinPromoCode
from app.services.payment_pricing_service import (
    build_quote,
    create_payment_intent,
    get_payment_settings,
    serialize_payment_request,
    update_exchange_rate,
)
from app.services.payment_service import (
    confirm_payment,
    create_payment_request,
    reject_payment,
)
from app.services.vcoin_service import get_balance
from app.services.vcoin_service import get_recent_ledger, spend_once_for_content


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
    telegram_id: int
    content_type: str
    reference_id: str


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
    discount_percent: int
    is_active: bool = True
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None


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


def _serialize_datetime(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


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
def get_vcoin_balance(telegram_id: int = Query(...), db: Session = Depends(get_db)):
    return {
        "telegram_id": int(telegram_id),
        "v_coins": get_balance(db, telegram_id),
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
    row = db.query(VCoinPromoCode).filter(VCoinPromoCode.code == code).first()
    if not row:
        row = VCoinPromoCode(code=code)
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


@router.get("/ledger")
def get_vcoin_ledger(
    telegram_id: int = Query(...),
    limit: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    entries = get_recent_ledger(db, telegram_id, limit=limit)
    return {
        "telegram_id": int(telegram_id),
        "items": [
            {
                "id": item.id,
                "delta": item.delta,
                "reason": item.reason,
                "reference_type": item.reference_type,
                "reference_id": item.reference_id,
                "balance_after": item.balance_after,
                "created_at": _serialize_datetime(item.created_at),
            }
            for item in entries
        ],
    }


@router.post("/spend")
def spend_vcoins(payload: VCoinSpendIn, db: Session = Depends(get_db)):
    result = spend_once_for_content(
        db=db,
        telegram_id=payload.telegram_id,
        content_type=payload.content_type,
        reference_id=payload.reference_id,
    )
    db.commit()
    return {
        "ok": True,
        "telegram_id": result.telegram_id,
        "content_type": payload.content_type,
        "reference_id": str(payload.reference_id),
        "required": result.required,
        "balance": result.balance,
        "already_spent": False,
    }


@router.get("/balance/{telegram_id}")
def get_vcoin_balance_by_path(telegram_id: int, db: Session = Depends(get_db)):
    return {
        "telegram_id": int(telegram_id),
        "v_coins": get_balance(db, telegram_id),
        "balance": get_balance(db, telegram_id),
    }
