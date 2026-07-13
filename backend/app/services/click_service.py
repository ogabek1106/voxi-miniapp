from __future__ import annotations

import hashlib
import hmac
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import (
    CLICK_CHECKOUT_BASE_URL,
    CLICK_MERCHANT_ID,
    CLICK_RETURN_URL,
    CLICK_SECRET_KEY,
    CLICK_SERVICE_ID,
)
from app.models import User
from app.models_click import ClickTransaction
from app.models_payments import PaymentOrder
from app.models_vcoins import CoinLedger
from app.services.payment_pricing_service import build_quote
from app.services.vcoin_service import add_coins


ORDER_EXPIRY_HOURS = 12

CLICK_SUCCESS = 0
CLICK_SIGN_CHECK_FAILED = -1
CLICK_INCORRECT_AMOUNT = -2
CLICK_ACTION_NOT_FOUND = -3
CLICK_ALREADY_PAID = -4
CLICK_USER_NOT_FOUND = -5
CLICK_TRANSACTION_NOT_FOUND = -6
CLICK_FAILED_TO_UPDATE_USER = -7
CLICK_ERROR_IN_REQUEST = -8
CLICK_TRANSACTION_CANCELLED = -9

CLICK_ERROR_NOTES = {
    CLICK_SUCCESS: "Success",
    CLICK_SIGN_CHECK_FAILED: "SIGN CHECK FAILED!",
    CLICK_INCORRECT_AMOUNT: "Incorrect parameter amount",
    CLICK_ACTION_NOT_FOUND: "Action not found",
    CLICK_ALREADY_PAID: "Already paid",
    CLICK_USER_NOT_FOUND: "User does not exist",
    CLICK_TRANSACTION_NOT_FOUND: "Transaction does not exist",
    CLICK_FAILED_TO_UPDATE_USER: "Failed to update user",
    CLICK_ERROR_IN_REQUEST: "Error in request from click",
    CLICK_TRANSACTION_CANCELLED: "Transaction cancelled",
}


class ClickError(Exception):
    def __init__(self, code: int):
        self.code = int(code)
        self.note = CLICK_ERROR_NOTES.get(self.code, CLICK_ERROR_NOTES[CLICK_ERROR_IN_REQUEST])
        super().__init__(self.note)


@contextmanager
def transaction_scope(db: Session):
    if not db.in_transaction():
        with db.begin():
            yield
        return

    try:
        yield
        db.commit()
    except Exception:
        db.rollback()
        raise


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_expired(order: PaymentOrder, now: datetime | None = None) -> bool:
    expires_at = _as_utc(order.expires_at)
    return bool(expires_at and expires_at <= (now or utcnow()))


def _to_decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value).strip()).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, AttributeError):
        raise ClickError(CLICK_INCORRECT_AMOUNT)


def _decimal_to_tiyin(value: Decimal) -> int:
    return int((value * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def _order_amount_decimal(order: PaymentOrder) -> Decimal:
    return (Decimal(int(order.amount_tiyin)) / Decimal("100")).quantize(Decimal("0.01"))


def _safe_int(value: Any, error_code: int = CLICK_ERROR_IN_REQUEST) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        raise ClickError(error_code)


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _configured_service_id() -> int:
    if not CLICK_SERVICE_ID:
        raise ClickError(CLICK_ERROR_IN_REQUEST)
    return _safe_int(CLICK_SERVICE_ID)


def _required_secret() -> str:
    if not CLICK_SECRET_KEY:
        raise ClickError(CLICK_SIGN_CHECK_FAILED)
    return CLICK_SECRET_KEY


def sign_prepare(fields: dict[str, Any]) -> str:
    raw = (
        f"{_clean(fields.get('click_trans_id'))}"
        f"{_clean(fields.get('service_id'))}"
        f"{_required_secret()}"
        f"{_clean(fields.get('merchant_trans_id'))}"
        f"{_clean(fields.get('amount'))}"
        f"{_clean(fields.get('action'))}"
        f"{_clean(fields.get('sign_time'))}"
    )
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def sign_complete(fields: dict[str, Any]) -> str:
    raw = (
        f"{_clean(fields.get('click_trans_id'))}"
        f"{_clean(fields.get('service_id'))}"
        f"{_required_secret()}"
        f"{_clean(fields.get('merchant_trans_id'))}"
        f"{_clean(fields.get('merchant_prepare_id'))}"
        f"{_clean(fields.get('amount'))}"
        f"{_clean(fields.get('action'))}"
        f"{_clean(fields.get('sign_time'))}"
    )
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _check_signature(fields: dict[str, Any], *, complete: bool = False) -> None:
    provided = _clean(fields.get("sign_string")).lower()
    expected = sign_complete(fields) if complete else sign_prepare(fields)
    if not provided or not hmac.compare_digest(provided, expected):
        raise ClickError(CLICK_SIGN_CHECK_FAILED)


def _sanitize_callback(fields: dict[str, Any]) -> dict[str, Any]:
    return {
        key: _clean(fields.get(key))
        for key in (
            "click_trans_id",
            "service_id",
            "click_paydoc_id",
            "merchant_trans_id",
            "merchant_prepare_id",
            "amount",
            "action",
            "error",
            "error_note",
            "sign_time",
            "sign_string",
        )
        if key in fields
    }


def _response_base(code: int) -> dict[str, Any]:
    return {"error": int(code), "error_note": CLICK_ERROR_NOTES.get(int(code), CLICK_ERROR_NOTES[CLICK_ERROR_IN_REQUEST])}


def prepare_response(
    *,
    code: int,
    click_trans_id: Any = None,
    merchant_trans_id: Any = None,
    merchant_prepare_id: Any = None,
) -> dict[str, Any]:
    body = {
        "click_trans_id": _safe_response_int(click_trans_id),
        "merchant_trans_id": _clean(merchant_trans_id),
        "merchant_prepare_id": _safe_response_int(merchant_prepare_id),
    }
    body.update(_response_base(code))
    return body


def complete_response(
    *,
    code: int,
    click_trans_id: Any = None,
    merchant_trans_id: Any = None,
    merchant_confirm_id: Any = None,
) -> dict[str, Any]:
    body = {
        "click_trans_id": _safe_response_int(click_trans_id),
        "merchant_trans_id": _clean(merchant_trans_id),
        "merchant_confirm_id": _safe_response_int(merchant_confirm_id),
    }
    body.update(_response_base(code))
    return body


def _safe_response_int(value: Any) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def _find_order_for_update(db: Session, order_ref: str) -> PaymentOrder | None:
    return db.query(PaymentOrder).filter(PaymentOrder.order_ref == order_ref).with_for_update().first()


def _find_tx_by_click_for_update(db: Session, click_trans_id: int) -> ClickTransaction | None:
    return (
        db.query(ClickTransaction)
        .filter(ClickTransaction.click_trans_id == int(click_trans_id))
        .with_for_update()
        .first()
    )


def _find_tx_by_prepare_for_update(db: Session, merchant_prepare_id: int) -> ClickTransaction | None:
    return (
        db.query(ClickTransaction)
        .filter(ClickTransaction.merchant_prepare_id == int(merchant_prepare_id))
        .with_for_update()
        .first()
    )


def _validate_order_for_prepare(order: PaymentOrder | None, amount: Decimal) -> PaymentOrder:
    if not order:
        raise ClickError(CLICK_USER_NOT_FOUND)
    if order.payment_provider != "click":
        raise ClickError(CLICK_USER_NOT_FOUND)
    if str(order.product_type or "").lower() != "vcoin":
        raise ClickError(CLICK_ERROR_IN_REQUEST)
    if _order_amount_decimal(order) != amount:
        raise ClickError(CLICK_INCORRECT_AMOUNT)
    if order.status in {"paid", "fulfilled"}:
        raise ClickError(CLICK_ALREADY_PAID)
    if order.status in {"cancelled", "expired", "fulfillment_failed"}:
        raise ClickError(CLICK_TRANSACTION_CANCELLED)
    if _is_expired(order):
        order.status = "expired"
        raise ClickError(CLICK_TRANSACTION_CANCELLED)
    if not order.telegram_id or int(order.telegram_id) <= 0 or not order.user_id:
        raise ClickError(CLICK_USER_NOT_FOUND)
    return order


def _mark_order_expired_if_needed(db: Session, order_ref: str) -> None:
    if not order_ref:
        return
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == order_ref).first()
    if order and order.status == "pending" and _is_expired(order):
        order.status = "expired"
        db.add(order)
        db.commit()


def _validate_prepared_tx(tx: ClickTransaction | None, fields: dict[str, Any], amount: Decimal) -> ClickTransaction:
    if not tx:
        raise ClickError(CLICK_TRANSACTION_NOT_FOUND)
    if int(tx.click_trans_id) != _safe_int(fields.get("click_trans_id")):
        raise ClickError(CLICK_TRANSACTION_NOT_FOUND)
    if int(tx.service_id) != _safe_int(fields.get("service_id")):
        raise ClickError(CLICK_ERROR_IN_REQUEST)
    if int(tx.click_paydoc_id) != _safe_int(fields.get("click_paydoc_id")):
        raise ClickError(CLICK_TRANSACTION_NOT_FOUND)
    if tx.merchant_trans_id != _clean(fields.get("merchant_trans_id")):
        raise ClickError(CLICK_TRANSACTION_NOT_FOUND)
    if Decimal(tx.amount).quantize(Decimal("0.01")) != amount:
        raise ClickError(CLICK_INCORRECT_AMOUNT)
    return tx


def _fulfill_vcoins_once(db: Session, order: PaymentOrder) -> None:
    if order.fulfillment_status == "fulfilled":
        return

    product_data = dict(order.product_data or {})
    coins = int(product_data.get("coins") or 0)
    if coins <= 0:
        order.fulfillment_status = "failed"
        order.status = "fulfillment_failed"
        order.fulfillment_error = "invalid_vcoin_quantity"
        raise ClickError(CLICK_FAILED_TO_UPDATE_USER)

    order.fulfillment_status = "processing"
    db.flush()
    add_coins(
        db=db,
        telegram_id=int(order.telegram_id),
        amount=coins,
        reason="click_vcoin_purchase",
        reference_type="payment_order",
        reference_id=str(order.id),
    )
    ledger = (
        db.query(CoinLedger)
        .filter(
            CoinLedger.telegram_id == int(order.telegram_id),
            CoinLedger.delta == coins,
            CoinLedger.reason == "click_vcoin_purchase",
            CoinLedger.reference_type == "payment_order",
            CoinLedger.reference_id == str(order.id),
        )
        .order_by(CoinLedger.id.desc())
        .first()
    )
    if ledger:
        order.fulfillment_ledger_id = ledger.id
    now = utcnow()
    order.fulfillment_status = "fulfilled"
    order.status = "fulfilled"
    order.fulfilled_at = now
    order.fulfillment_error = None


def handle_prepare(db: Session, fields: dict[str, Any]) -> dict[str, Any]:
    click_trans_id = _clean(fields.get("click_trans_id"))
    merchant_trans_id = _clean(fields.get("merchant_trans_id"))
    try:
        service_id = _safe_int(fields.get("service_id"), CLICK_ERROR_IN_REQUEST)
        action = _safe_int(fields.get("action"), CLICK_ACTION_NOT_FOUND)
        if service_id != _configured_service_id():
            raise ClickError(CLICK_ERROR_IN_REQUEST)
        if action != 0:
            raise ClickError(CLICK_ACTION_NOT_FOUND)
        _check_signature(fields)
        click_id = _safe_int(fields.get("click_trans_id"))
        paydoc_id = _safe_int(fields.get("click_paydoc_id"))
        amount = _to_decimal(fields.get("amount"))
        if not merchant_trans_id:
            raise ClickError(CLICK_USER_NOT_FOUND)

        with transaction_scope(db):
            existing = _find_tx_by_click_for_update(db, click_id)
            if existing:
                if existing.merchant_trans_id != merchant_trans_id or Decimal(existing.amount).quantize(Decimal("0.01")) != amount:
                    raise ClickError(CLICK_INCORRECT_AMOUNT)
                existing.raw_prepare_request = _sanitize_callback(fields)
                return prepare_response(
                    code=CLICK_SUCCESS,
                    click_trans_id=existing.click_trans_id,
                    merchant_trans_id=existing.merchant_trans_id,
                    merchant_prepare_id=existing.merchant_prepare_id or existing.id,
                )

            order = _find_order_for_update(db, merchant_trans_id)
            _validate_order_for_prepare(order, amount)

            tx = ClickTransaction(
                click_trans_id=click_id,
                service_id=service_id,
                click_paydoc_id=paydoc_id,
                merchant_trans_id=merchant_trans_id,
                order_id=order.id,
                amount=amount,
                amount_tiyin=_decimal_to_tiyin(amount),
                action=0,
                state="prepared",
                error=0,
                error_note=CLICK_ERROR_NOTES[CLICK_SUCCESS],
                sign_time=_clean(fields.get("sign_time")),
                raw_prepare_request=_sanitize_callback(fields),
                prepared_at=utcnow(),
            )
            db.add(tx)
            db.flush()
            tx.merchant_prepare_id = int(tx.id)
            db.flush()
            return prepare_response(
                code=CLICK_SUCCESS,
                click_trans_id=tx.click_trans_id,
                merchant_trans_id=tx.merchant_trans_id,
                merchant_prepare_id=tx.merchant_prepare_id,
            )
    except ClickError as exc:
        if db.is_active:
            db.rollback()
        if exc.code == CLICK_TRANSACTION_CANCELLED:
            _mark_order_expired_if_needed(db, merchant_trans_id)
        return prepare_response(
            code=exc.code,
            click_trans_id=click_trans_id,
            merchant_trans_id=merchant_trans_id,
            merchant_prepare_id=fields.get("merchant_prepare_id") or 0,
        )
    except IntegrityError:
        if db.is_active:
            db.rollback()
        return prepare_response(
            code=CLICK_ERROR_IN_REQUEST,
            click_trans_id=click_trans_id,
            merchant_trans_id=merchant_trans_id,
            merchant_prepare_id=0,
        )


def handle_complete(db: Session, fields: dict[str, Any]) -> dict[str, Any]:
    click_trans_id = _clean(fields.get("click_trans_id"))
    merchant_trans_id = _clean(fields.get("merchant_trans_id"))
    merchant_prepare_id = fields.get("merchant_prepare_id")
    try:
        service_id = _safe_int(fields.get("service_id"), CLICK_ERROR_IN_REQUEST)
        action = _safe_int(fields.get("action"), CLICK_ACTION_NOT_FOUND)
        click_error = _safe_int(fields.get("error"), CLICK_ERROR_IN_REQUEST)
        if service_id != _configured_service_id():
            raise ClickError(CLICK_ERROR_IN_REQUEST)
        if action != 1:
            raise ClickError(CLICK_ACTION_NOT_FOUND)
        _check_signature(fields, complete=True)
        amount = _to_decimal(fields.get("amount"))
        prepare_id = _safe_int(merchant_prepare_id, CLICK_TRANSACTION_NOT_FOUND)

        with transaction_scope(db):
            tx = _find_tx_by_prepare_for_update(db, prepare_id)
            _validate_prepared_tx(tx, fields, amount)
            tx.raw_complete_request = _sanitize_callback(fields)
            tx.action = 1

            if tx.state == "completed":
                return complete_response(
                    code=CLICK_SUCCESS,
                    click_trans_id=tx.click_trans_id,
                    merchant_trans_id=tx.merchant_trans_id,
                    merchant_confirm_id=tx.merchant_confirm_id or tx.id,
                )
            if tx.state == "cancelled":
                raise ClickError(CLICK_TRANSACTION_CANCELLED)
            if tx.state == "failed":
                raise ClickError(CLICK_TRANSACTION_CANCELLED)

            order = (
                db.query(PaymentOrder)
                .filter(PaymentOrder.id == tx.order_id)
                .with_for_update()
                .first()
            )
            if not order:
                raise ClickError(CLICK_USER_NOT_FOUND)
            if _order_amount_decimal(order) != amount:
                raise ClickError(CLICK_INCORRECT_AMOUNT)

            if click_error < 0:
                tx.state = "cancelled"
                tx.error = click_error
                tx.error_note = _clean(fields.get("error_note")) or CLICK_ERROR_NOTES[CLICK_TRANSACTION_CANCELLED]
                tx.failure_reason = tx.error_note
                tx.cancelled_at = utcnow()
                if order.status == "pending":
                    order.status = "cancelled"
                    order.cancelled_at = order.cancelled_at or utcnow()
                return complete_response(
                    code=CLICK_TRANSACTION_CANCELLED,
                    click_trans_id=tx.click_trans_id,
                    merchant_trans_id=tx.merchant_trans_id,
                    merchant_confirm_id=tx.merchant_confirm_id or 0,
                )

            if order.status in {"fulfilled", "paid"} and order.fulfillment_status == "fulfilled":
                tx.state = "completed"
                tx.merchant_confirm_id = tx.merchant_confirm_id or tx.id
                return complete_response(
                    code=CLICK_SUCCESS,
                    click_trans_id=tx.click_trans_id,
                    merchant_trans_id=tx.merchant_trans_id,
                    merchant_confirm_id=tx.merchant_confirm_id,
                )
            if order.status in {"cancelled", "expired", "fulfillment_failed"}:
                raise ClickError(CLICK_TRANSACTION_CANCELLED)
            if _is_expired(order):
                order.status = "expired"
                raise ClickError(CLICK_TRANSACTION_CANCELLED)

            tx.state = "completed"
            tx.error = 0
            tx.error_note = CLICK_ERROR_NOTES[CLICK_SUCCESS]
            tx.completed_at = tx.completed_at or utcnow()
            tx.merchant_confirm_id = tx.merchant_confirm_id or tx.id
            order.status = "paid"
            order.payment_completed_at = order.payment_completed_at or utcnow()
            _fulfill_vcoins_once(db, order)
            return complete_response(
                code=CLICK_SUCCESS,
                click_trans_id=tx.click_trans_id,
                merchant_trans_id=tx.merchant_trans_id,
                merchant_confirm_id=tx.merchant_confirm_id,
            )
    except ClickError as exc:
        if db.is_active:
            db.rollback()
        return complete_response(
            code=exc.code,
            click_trans_id=click_trans_id,
            merchant_trans_id=merchant_trans_id,
            merchant_confirm_id=0,
        )


def generate_order_ref(db: Session) -> str:
    for _ in range(40):
        ref = secrets.token_urlsafe(24)[:48]
        exists = db.query(PaymentOrder.id).filter(PaymentOrder.order_ref == ref).first()
        if not exists:
            return ref
    raise HTTPException(status_code=500, detail="payment_order_ref_generation_failed")


def build_checkout_url(order_ref: str, amount_tiyin: int) -> str:
    if not CLICK_MERCHANT_ID:
        raise HTTPException(status_code=503, detail="click_merchant_id_not_configured")
    if not CLICK_SERVICE_ID:
        raise HTTPException(status_code=503, detail="click_service_id_not_configured")
    if not CLICK_CHECKOUT_BASE_URL:
        raise HTTPException(status_code=503, detail="click_checkout_base_url_not_configured")

    amount = (Decimal(int(amount_tiyin)) / Decimal("100")).quantize(Decimal("0.01"))
    params = {
        "service_id": CLICK_SERVICE_ID,
        "merchant_id": CLICK_MERCHANT_ID,
        "amount": format(amount, ".2f"),
        "transaction_param": order_ref,
    }
    if CLICK_RETURN_URL:
        params["return_url"] = CLICK_RETURN_URL
    base_url = CLICK_CHECKOUT_BASE_URL.strip()
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode(params)}"


def create_vcoin_checkout_order(
    db: Session,
    *,
    telegram_id: int,
    coins: int,
    promo_code: str | None = None,
) -> dict[str, Any]:
    telegram_id = int(telegram_id or 0)
    if telegram_id <= 0:
        raise HTTPException(status_code=422, detail="telegram_id_required")

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user or not user.telegram_id:
        raise HTTPException(status_code=404, detail="user_not_found")

    quote = build_quote(db, coins, promo_code)
    if int(quote.final_amount) <= 0:
        raise HTTPException(status_code=422, detail="amount_must_be_positive")

    amount_tiyin = int(quote.final_amount) * 100
    now = utcnow()
    order = PaymentOrder(
        order_ref=generate_order_ref(db),
        user_id=int(user.id),
        telegram_id=int(user.telegram_id),
        product_type="vcoin",
        product_data={
            "type": "vcoin",
            "coins": int(quote.coins),
            "promo_code": quote.promo_code,
        },
        quote_snapshot={
            "coins": int(quote.coins),
            "exchange_rate_uzs": int(quote.exchange_rate_uzs),
            "subtotal_amount_uzs": int(quote.subtotal_amount),
            "promo_code": quote.promo_code,
            "discount_percent": int(quote.discount_percent or 0),
            "discount_amount_uzs": int(quote.discount_amount or 0),
            "final_amount_uzs": int(quote.final_amount),
            "amount_tiyin": amount_tiyin,
            "quoted_at": now.isoformat(),
        },
        amount_tiyin=amount_tiyin,
        currency="UZS",
        payment_provider="click",
        status="pending",
        fulfillment_status="not_started",
        expires_at=now + timedelta(hours=ORDER_EXPIRY_HOURS),
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "order_ref": order.order_ref,
        "amount": format(Decimal(int(order.amount_tiyin)) / Decimal("100"), ".2f"),
        "checkout_url": build_checkout_url(order.order_ref, int(order.amount_tiyin)),
        "expires_at": order.expires_at.isoformat(),
    }
