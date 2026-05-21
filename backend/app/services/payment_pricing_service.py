from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models_vcoins import PaymentRequest, VCoinPaymentSettings, VCoinPromoCode


DEFAULT_EXCHANGE_RATE_UZS = 5000
PAYMENT_EXPIRY_HOURS = 24


@dataclass(frozen=True)
class PaymentQuote:
    coins: int
    exchange_rate_uzs: int
    subtotal_amount: int
    promo_code: Optional[str]
    discount_percent: int
    discount_amount: int
    final_amount: int


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_code(value: str | None) -> str | None:
    cleaned = str(value or "").strip().upper()
    return cleaned or None


def get_payment_settings(db: Session) -> VCoinPaymentSettings:
    row = db.query(VCoinPaymentSettings).filter(VCoinPaymentSettings.id == 1).first()
    if row:
        return row
    row = VCoinPaymentSettings(id=1, exchange_rate_uzs=DEFAULT_EXCHANGE_RATE_UZS, updated_at=utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_exchange_rate(db: Session, exchange_rate_uzs: int) -> VCoinPaymentSettings:
    rate = int(exchange_rate_uzs or 0)
    if rate <= 0:
        raise HTTPException(status_code=422, detail="exchange_rate_must_be_positive")
    row = get_payment_settings(db)
    row.exchange_rate_uzs = rate
    row.updated_at = utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def normalize_scope(value: str | None) -> str:
    cleaned = str(value or "vcoin").strip().lower().replace("-", "_")
    return cleaned if cleaned in {"vcoin", "premiere"} else "vcoin"


def get_valid_promo(db: Session, code: str | None, scope: str = "vcoin") -> VCoinPromoCode | None:
    normalized = normalize_code(code)
    if not normalized:
        return None
    normalized_scope = normalize_scope(scope)
    promo = db.query(VCoinPromoCode).filter(VCoinPromoCode.code == normalized).first()
    if not promo:
        raise HTTPException(status_code=404, detail="promo_code_not_found")
    if normalize_scope(getattr(promo, "scope", None)) != normalized_scope:
        raise HTTPException(status_code=404, detail="promo_code_not_found")
    if not promo.is_active:
        raise HTTPException(status_code=422, detail="promo_code_inactive")
    now = utcnow()
    expires_at = promo.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at <= now:
        raise HTTPException(status_code=422, detail="promo_code_expired")
    if promo.usage_limit is not None and int(promo.successful_uses or 0) >= int(promo.usage_limit):
        raise HTTPException(status_code=422, detail="promo_code_usage_limit_reached")
    return promo


def build_quote(db: Session, coins: int, promo_code: str | None = None) -> PaymentQuote:
    amount = int(coins or 0)
    if amount <= 0:
        raise HTTPException(status_code=422, detail="coins_must_be_positive")
    settings = get_payment_settings(db)
    rate = int(settings.exchange_rate_uzs or DEFAULT_EXCHANGE_RATE_UZS)
    subtotal = amount * rate
    promo = get_valid_promo(db, promo_code)
    percent = int(promo.discount_percent or 0) if promo else 0
    discount = int(round(subtotal * percent / 100)) if percent else 0
    final = max(subtotal - discount, 0)
    return PaymentQuote(
        coins=amount,
        exchange_rate_uzs=rate,
        subtotal_amount=subtotal,
        promo_code=promo.code if promo else None,
        discount_percent=percent,
        discount_amount=discount,
        final_amount=final,
    )


def generate_payment_token(db: Session) -> str:
    for digits in (4, 5, 6):
        for _ in range(40):
            token = f"VC-{random.randint(10 ** (digits - 1), (10 ** digits) - 1)}"
            exists = db.query(PaymentRequest.id).filter(PaymentRequest.payment_token == token).first()
            if not exists:
                return token
    raise HTTPException(status_code=500, detail="payment_token_generation_failed")


def create_payment_intent(
    db: Session,
    *,
    telegram_id: int,
    coins: int,
    promo_code: str | None = None,
) -> PaymentRequest:
    quote = build_quote(db, coins, promo_code)
    now = utcnow()
    token = generate_payment_token(db)
    request = PaymentRequest(
        telegram_id=int(telegram_id),
        package_code="custom",
        expected_price=str(quote.final_amount),
        coins_to_add=quote.coins,
        payment_token=token,
        exchange_rate_uzs=quote.exchange_rate_uzs,
        subtotal_amount=quote.subtotal_amount,
        promo_code=quote.promo_code,
        discount_percent=quote.discount_percent,
        discount_amount=quote.discount_amount,
        final_amount=quote.final_amount,
        expires_at=now + timedelta(hours=PAYMENT_EXPIRY_HOURS),
        status="pending",
        raw_payload={
            "source": "website_payment_intent",
            "coins": quote.coins,
            "promo_code": quote.promo_code,
            "created_at": now.isoformat(),
        },
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def serialize_payment_request(payment: PaymentRequest) -> dict:
    raw_payload = dict(payment.raw_payload or {})
    receipt_submitted = bool(payment.receipt_file_id or payment.receipt_image_hash or raw_payload.get("receipt_payload"))
    return {
        "id": payment.id,
        "telegram_id": payment.telegram_id,
        "user_id": payment.user_id,
        "email": payment.email,
        "payment_token": payment.payment_token,
        "coins_to_add": payment.coins_to_add,
        "exchange_rate_uzs": payment.exchange_rate_uzs,
        "subtotal_amount": payment.subtotal_amount,
        "promo_code": payment.promo_code,
        "discount_percent": payment.discount_percent or 0,
        "discount_amount": payment.discount_amount or 0,
        "final_amount": payment.final_amount,
        "expected_price": payment.expected_price,
        "status": payment.status,
        "receipt_submitted": receipt_submitted,
        "reject_reason": payment.reject_reason,
        "payment_kind": raw_payload.get("payment_kind"),
        "mock_pack_id": raw_payload.get("mock_pack_id"),
        "mock_title": raw_payload.get("mock_title"),
        "expires_at": payment.expires_at.isoformat() if payment.expires_at else None,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
        "rejected_at": payment.rejected_at.isoformat() if payment.rejected_at else None,
    }
