from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models_vcoins import PaymentRequest
from app.models_vcoins import VCoinPromoCode
from app.services.vcoin_service import add_coins, get_balance


FINAL_STATUSES = {"admin_confirmed", "admin_rejected", "refunded", "expired"}


def utcnow():
    return datetime.now(timezone.utc)


def _as_int(value: Any, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail=f"{field_name}_must_be_integer")
    if parsed <= 0:
        raise HTTPException(status_code=422, detail=f"{field_name}_must_be_positive")
    return parsed


def detect_duplicate(db: Session, receipt_image_hash: Optional[str]) -> bool:
    if not receipt_image_hash:
        return False

    existing = (
        db.query(PaymentRequest)
        .filter(PaymentRequest.receipt_image_hash == receipt_image_hash)
        .first()
    )
    return existing is not None


def create_payment_request(db: Session, payload: Dict[str, Any]) -> PaymentRequest:
    payment_token = str(payload.get("payment_token") or payload.get("token") or "").strip().upper()
    if payment_token:
        existing = (
            db.query(PaymentRequest)
            .filter(PaymentRequest.payment_token == payment_token)
            .with_for_update()
            .first()
        )
        if not existing:
            raise HTTPException(status_code=404, detail="payment_token_not_found")
        if existing.status in FINAL_STATUSES:
            raise HTTPException(status_code=422, detail="payment_request_already_finalized")
        expires_at = existing.expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at <= utcnow():
            existing.status = "expired"
            db.add(existing)
            db.commit()
            raise HTTPException(status_code=422, detail="payment_request_expired")
        receipt_hash = payload.get("receipt_image_hash")
        duplicate = detect_duplicate(db, receipt_hash)
        existing.receipt_file_id = payload.get("receipt_file_id") or existing.receipt_file_id
        existing.receipt_image_hash = receipt_hash or existing.receipt_image_hash
        if duplicate:
            existing.status = "duplicate_suspected"
        elif existing.status not in {"duplicate_suspected"}:
            existing.status = "pending"
        raw_payload = dict(existing.raw_payload or {})
        raw_payload["receipt_payload"] = payload
        existing.raw_payload = raw_payload
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    telegram_id = _as_int(payload.get("telegram_id"), "telegram_id")
    coins = _as_int(payload.get("coins") or payload.get("coins_to_add"), "coins")
    receipt_hash = payload.get("receipt_image_hash")
    duplicate = detect_duplicate(db, receipt_hash)

    request = PaymentRequest(
        telegram_id=telegram_id,
        package_code=payload.get("package_code"),
        expected_price=str(payload.get("price") or payload.get("expected_amount") or ""),
        coins_to_add=coins,
        receipt_file_id=payload.get("receipt_file_id"),
        receipt_image_hash=receipt_hash,
        status="duplicate_suspected" if duplicate else "pending",
        raw_payload=payload,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def _get_payment_for_update(db: Session, payment_id: int) -> PaymentRequest:
    payment = (
        db.query(PaymentRequest)
        .filter(PaymentRequest.id == int(payment_id))
        .with_for_update()
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="payment_request_not_found")
    return payment


def confirm_payment(db: Session, payment_id: int, admin_id: Optional[int] = None) -> Dict[str, Any]:
    payment = _get_payment_for_update(db, payment_id)

    if payment.status == "admin_confirmed":
        return {
            "ok": True,
            "status": payment.status,
            "already_finalized": True,
            "telegram_id": None,
            "coins_added": payment.coins_to_add,
            "balance": get_balance(db, payment.telegram_id),
        }

    if payment.status in FINAL_STATUSES:
        return {
            "ok": True,
            "status": payment.status,
            "already_finalized": True,
            "telegram_id": None,
            "coins_added": 0,
            "balance": get_balance(db, payment.telegram_id),
        }

    balance = add_coins(
        db=db,
        telegram_id=payment.telegram_id,
        amount=payment.coins_to_add,
        reason="payment_confirmed",
        reference_type="payment_request",
        reference_id=payment.id,
    )

    payment.status = "admin_confirmed"
    payment.confirmed_at = utcnow()
    payment.admin_id = int(admin_id) if admin_id is not None else None
    if payment.promo_code:
        promo = (
            db.query(VCoinPromoCode)
            .filter(VCoinPromoCode.code == str(payment.promo_code).upper())
            .with_for_update()
            .first()
        )
        if promo:
            promo.successful_uses = int(promo.successful_uses or 0) + 1
            promo.updated_at = utcnow()
            db.add(promo)
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "ok": True,
        "status": payment.status,
        "telegram_id": payment.telegram_id,
        "coins_added": payment.coins_to_add,
        "balance": balance,
    }


def reject_payment(
    db: Session,
    payment_id: int,
    admin_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    payment = _get_payment_for_update(db, payment_id)

    if payment.status == "admin_rejected":
        return {
            "ok": True,
            "status": payment.status,
            "already_finalized": True,
            "telegram_id": None,
            "balance": get_balance(db, payment.telegram_id),
        }

    if payment.status in FINAL_STATUSES:
        return {
            "ok": True,
            "status": payment.status,
            "already_finalized": True,
            "telegram_id": None,
            "balance": get_balance(db, payment.telegram_id),
        }

    payment.status = "admin_rejected"
    payment.rejected_at = utcnow()
    payment.admin_id = int(admin_id) if admin_id is not None else None
    payment.reject_reason = reason
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "ok": True,
        "status": payment.status,
        "telegram_id": payment.telegram_id,
        "balance": get_balance(db, payment.telegram_id),
    }
