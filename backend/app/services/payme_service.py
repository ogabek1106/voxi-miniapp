from __future__ import annotations

import base64
import hmac
import secrets
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote_plus

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import PAYME_CHECKOUT_BASE_URL, PAYME_MERCHANT_ID, PAYME_RETURN_URL, PAYME_SECRET_KEY
from app.models import User
from app.models_payments import PaymentOrder, PaymeTransaction
from app.models_vcoins import CoinLedger
from app.services.payment_pricing_service import build_quote
from app.services.vcoin_service import add_coins


PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000
ORDER_EXPIRY_HOURS = 12

PAYME_STATE_CREATED = 1
PAYME_STATE_PERFORMED = 2
PAYME_STATE_CANCELLED_BEFORE_PERFORM = -1
PAYME_STATE_CANCELLED_AFTER_PERFORM = -2

PAYME_REASON_TIMEOUT = 4


class PaymeError(Exception):
    def __init__(self, code: int, message: str, data: str | None = None):
        self.code = int(code)
        self.message = message
        self.data = data
        super().__init__(message)


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


def current_millis() -> int:
    return int(time.time() * 1000)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def jsonrpc_success(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "result": result, "id": request_id}


def jsonrpc_error(request_id: Any, error: PaymeError) -> dict[str, Any]:
    body: dict[str, Any] = {
        "code": error.code,
        "message": {
            "ru": error.message,
            "uz": error.message,
            "en": error.message,
        },
    }
    if error.data:
        body["data"] = error.data
    return {"jsonrpc": "2.0", "error": body, "id": request_id}


def access_denied_error() -> PaymeError:
    return PaymeError(-32504, "Access denied")


def invalid_method_error() -> PaymeError:
    return PaymeError(-32601, "Method not found")


def order_not_found_error() -> PaymeError:
    return PaymeError(-31050, "Order not found", "order_id")


def invalid_amount_error() -> PaymeError:
    return PaymeError(-31001, "Incorrect amount", "amount")


def transaction_not_found_error() -> PaymeError:
    return PaymeError(-31003, "Transaction not found")


def cannot_perform_error() -> PaymeError:
    return PaymeError(-31008, "Cannot perform transaction")


def cannot_cancel_error() -> PaymeError:
    return PaymeError(-31007, "Cannot cancel transaction")


def sanitize_raw_request(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    return {
        "id": payload.get("id"),
        "method": payload.get("method"),
        "params": payload.get("params") if isinstance(payload.get("params"), dict) else {},
    }


def extract_order_ref(params: dict[str, Any] | None) -> str | None:
    account = params.get("account") if isinstance(params, dict) else None
    if not isinstance(account, dict):
        return None
    value = account.get("order_id")
    cleaned = str(value or "").strip()
    return cleaned or None


def extract_payme_id(params: dict[str, Any] | None) -> str | None:
    value = params.get("id") if isinstance(params, dict) else None
    cleaned = str(value or "").strip()
    return cleaned or None


def extract_amount(params: dict[str, Any] | None) -> int:
    try:
        return int(params.get("amount"))
    except Exception:
        raise invalid_amount_error()


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_expired(order: PaymentOrder, now: datetime | None = None) -> bool:
    expires_at = _as_utc(order.expires_at)
    return bool(expires_at and expires_at <= (now or utcnow()))


def _public_order_status_blocks(order: PaymentOrder) -> bool:
    return order.status in {"paid", "fulfilled", "cancelled", "expired", "fulfillment_failed"}


def _validate_order_for_payme(order: PaymentOrder | None, amount_tiyin: int | None = None) -> PaymentOrder:
    if not order:
        raise order_not_found_error()
    if order.payment_provider != "payme":
        raise order_not_found_error()
    if str(order.product_type or "").lower() != "vcoin":
        raise cannot_perform_error()
    if amount_tiyin is not None and int(order.amount_tiyin) != int(amount_tiyin):
        raise invalid_amount_error()
    if _public_order_status_blocks(order):
        raise cannot_perform_error()
    if _is_expired(order):
        order.status = "expired"
        raise cannot_perform_error()
    if not order.telegram_id or int(order.telegram_id) <= 0:
        raise cannot_perform_error()
    if not order.user_id:
        raise cannot_perform_error()
    return order


def transaction_result(tx: PaymeTransaction) -> dict[str, Any]:
    return {
        "create_time": int(tx.create_time_ms or 0),
        "perform_time": int(tx.perform_time_ms or 0),
        "cancel_time": int(tx.cancel_time_ms or 0),
        "transaction": str(tx.id),
        "state": int(tx.state),
        "reason": tx.reason,
    }


def create_transaction_result(tx: PaymeTransaction) -> dict[str, Any]:
    return {
        "create_time": int(tx.create_time_ms),
        "transaction": str(tx.id),
        "state": int(tx.state),
    }


def perform_transaction_result(tx: PaymeTransaction) -> dict[str, Any]:
    return {
        "transaction": str(tx.id),
        "perform_time": int(tx.perform_time_ms or 0),
        "state": int(tx.state),
    }


def cancel_transaction_result(tx: PaymeTransaction) -> dict[str, Any]:
    return {
        "transaction": str(tx.id),
        "cancel_time": int(tx.cancel_time_ms or 0),
        "state": int(tx.state),
    }


def statement_transaction(tx: PaymeTransaction) -> dict[str, Any]:
    return {
        "id": tx.payme_transaction_id,
        "time": int(tx.payme_time_ms),
        "amount": int(tx.amount_tiyin),
        "account": tx.account or {},
        "create_time": int(tx.create_time_ms or 0),
        "perform_time": int(tx.perform_time_ms or 0),
        "cancel_time": int(tx.cancel_time_ms or 0),
        "transaction": str(tx.id),
        "state": int(tx.state),
        "reason": tx.reason,
    }


def check_basic_auth(authorization: str | None) -> bool:
    if not PAYME_SECRET_KEY:
        return False
    header = str(authorization or "").strip()
    if not header.lower().startswith("basic "):
        return False
    token = header.split(" ", 1)[1].strip()
    try:
        decoded = base64.b64decode(token, validate=True).decode("utf-8")
    except Exception:
        return False
    username, separator, password = decoded.partition(":")
    if not separator:
        return False
    if username != "Paycom":
        return False
    return hmac.compare_digest(password, PAYME_SECRET_KEY)


def _find_order_for_update(db: Session, order_ref: str) -> PaymentOrder | None:
    return (
        db.query(PaymentOrder)
        .filter(PaymentOrder.order_ref == order_ref)
        .with_for_update()
        .first()
    )


def _find_transaction_for_update(db: Session, payme_id: str) -> PaymeTransaction | None:
    return (
        db.query(PaymeTransaction)
        .filter(PaymeTransaction.payme_transaction_id == payme_id)
        .with_for_update()
        .first()
    )


def _cancel_stale_created_transaction(tx: PaymeTransaction, now_ms: int) -> None:
    if int(tx.state) == PAYME_STATE_CREATED and now_ms - int(tx.create_time_ms or 0) > PAYME_TIMEOUT_MS:
        tx.state = PAYME_STATE_CANCELLED_BEFORE_PERFORM
        tx.reason = PAYME_REASON_TIMEOUT
        tx.cancel_time_ms = tx.cancel_time_ms or now_ms


def _active_transaction_for_order(db: Session, order_id: int, exclude_payme_id: str | None = None) -> PaymeTransaction | None:
    query = (
        db.query(PaymeTransaction)
        .filter(PaymeTransaction.order_id == int(order_id))
        .filter(PaymeTransaction.state.in_([PAYME_STATE_CREATED, PAYME_STATE_PERFORMED]))
        .with_for_update()
    )
    if exclude_payme_id:
        query = query.filter(PaymeTransaction.payme_transaction_id != exclude_payme_id)
    return query.order_by(PaymeTransaction.id.asc()).first()


def check_perform_transaction(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    order_ref = extract_order_ref(params)
    if not order_ref:
        raise order_not_found_error()
    amount = extract_amount(params)
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == order_ref).first()
    _validate_order_for_payme(order, amount)
    user = db.query(User).filter(User.id == order.user_id).first()
    if not user or not user.telegram_id or int(user.telegram_id) != int(order.telegram_id):
        raise cannot_perform_error()
    return {"allow": True}


def create_transaction(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    payme_id = extract_payme_id(params)
    order_ref = extract_order_ref(params)
    if not payme_id or len(payme_id) != 24:
        raise transaction_not_found_error()
    if not order_ref:
        raise order_not_found_error()
    amount = extract_amount(params)
    payme_time_ms = int(params.get("time") or 0)
    if payme_time_ms <= 0:
        raise cannot_perform_error()

    now_ms = current_millis()
    with transaction_scope(db):
        existing = _find_transaction_for_update(db, payme_id)
        if existing:
            if existing.raw_create_request != sanitize_raw_request(payload):
                existing.raw_create_request = sanitize_raw_request(payload)
            _cancel_stale_created_transaction(existing, now_ms)
            if existing.account.get("order_id") != order_ref or int(existing.amount_tiyin) != int(amount):
                raise invalid_amount_error()
            return create_transaction_result(existing)

        order = _find_order_for_update(db, order_ref)
        _validate_order_for_payme(order, amount)

        active = _active_transaction_for_order(db, order.id)
        if active:
            _cancel_stale_created_transaction(active, now_ms)
            if int(active.state) in {PAYME_STATE_CREATED, PAYME_STATE_PERFORMED}:
                raise cannot_perform_error()

        tx = PaymeTransaction(
            payme_transaction_id=payme_id,
            order_id=order.id,
            payme_time_ms=payme_time_ms,
            amount_tiyin=amount,
            state=PAYME_STATE_CREATED,
            create_time_ms=now_ms,
            account=dict(params.get("account") or {}),
            raw_create_request=sanitize_raw_request(payload),
        )
        db.add(tx)
        try:
            db.flush()
        except IntegrityError:
            raise cannot_perform_error()
        return create_transaction_result(tx)


def _fulfill_vcoins_once(db: Session, order: PaymentOrder) -> None:
    if order.fulfillment_status == "fulfilled" and order.fulfillment_ledger_id:
        return
    if order.fulfillment_status == "fulfilled":
        return

    product_data = dict(order.product_data or {})
    coins = int(product_data.get("coins") or 0)
    if coins <= 0:
        order.fulfillment_status = "failed"
        order.status = "fulfillment_failed"
        order.fulfillment_error = "invalid_vcoin_quantity"
        raise cannot_perform_error()

    order.fulfillment_status = "processing"
    db.flush()
    add_coins(
        db=db,
        telegram_id=int(order.telegram_id),
        amount=coins,
        reason="payme_vcoin_purchase",
        reference_type="payment_order",
        reference_id=str(order.id),
    )
    ledger = (
        db.query(CoinLedger)
        .filter(
            CoinLedger.telegram_id == int(order.telegram_id),
            CoinLedger.delta == coins,
            CoinLedger.reason == "payme_vcoin_purchase",
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


def perform_transaction(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    payme_id = extract_payme_id(params)
    if not payme_id:
        raise transaction_not_found_error()

    now_ms = current_millis()
    with transaction_scope(db):
        tx = _find_transaction_for_update(db, payme_id)
        if not tx:
            raise transaction_not_found_error()
        tx.raw_perform_request = sanitize_raw_request(payload)
        if int(tx.state) == PAYME_STATE_PERFORMED:
            return perform_transaction_result(tx)
        if int(tx.state) in {PAYME_STATE_CANCELLED_BEFORE_PERFORM, PAYME_STATE_CANCELLED_AFTER_PERFORM}:
            raise cannot_perform_error()

        _cancel_stale_created_transaction(tx, now_ms)
        if int(tx.state) == PAYME_STATE_CANCELLED_BEFORE_PERFORM:
            raise cannot_perform_error()

        order = (
            db.query(PaymentOrder)
            .filter(PaymentOrder.id == tx.order_id)
            .with_for_update()
            .first()
        )
        _validate_order_for_payme(order, int(tx.amount_tiyin))

        tx.state = PAYME_STATE_PERFORMED
        tx.perform_time_ms = tx.perform_time_ms or now_ms
        order.status = "paid"
        order.payment_completed_at = order.payment_completed_at or utcnow()
        _fulfill_vcoins_once(db, order)
        return perform_transaction_result(tx)


def cancel_transaction(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    payme_id = extract_payme_id(params)
    if not payme_id:
        raise transaction_not_found_error()
    reason = params.get("reason")
    try:
        reason = int(reason) if reason is not None else None
    except Exception:
        reason = None

    now_ms = current_millis()
    with transaction_scope(db):
        tx = _find_transaction_for_update(db, payme_id)
        if not tx:
            raise transaction_not_found_error()
        tx.raw_cancel_request = sanitize_raw_request(payload)

        if int(tx.state) in {PAYME_STATE_CANCELLED_BEFORE_PERFORM, PAYME_STATE_CANCELLED_AFTER_PERFORM}:
            return cancel_transaction_result(tx)

        order = (
            db.query(PaymentOrder)
            .filter(PaymentOrder.id == tx.order_id)
            .with_for_update()
            .first()
        )

        if int(tx.state) == PAYME_STATE_CREATED:
            tx.state = PAYME_STATE_CANCELLED_BEFORE_PERFORM
            tx.reason = reason
            tx.cancel_time_ms = tx.cancel_time_ms or now_ms
            if order and order.status == "pending":
                order.status = "cancelled"
                order.cancelled_at = order.cancelled_at or utcnow()
            return cancel_transaction_result(tx)

        if int(tx.state) == PAYME_STATE_PERFORMED:
            if order and order.fulfillment_status == "fulfilled":
                raise cannot_cancel_error()
            tx.state = PAYME_STATE_CANCELLED_AFTER_PERFORM
            tx.reason = reason
            tx.cancel_time_ms = tx.cancel_time_ms or now_ms
            if order and order.status != "fulfilled":
                order.status = "cancelled"
                order.cancelled_at = order.cancelled_at or utcnow()
            return cancel_transaction_result(tx)

        raise cannot_cancel_error()


def check_transaction(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    payme_id = extract_payme_id(params)
    if not payme_id:
        raise transaction_not_found_error()
    tx = db.query(PaymeTransaction).filter(PaymeTransaction.payme_transaction_id == payme_id).first()
    if not tx:
        raise transaction_not_found_error()
    tx.raw_check_request = sanitize_raw_request(payload)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return transaction_result(tx)


def get_statement(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    try:
        from_ms = int(params.get("from"))
        to_ms = int(params.get("to"))
    except Exception:
        raise PaymeError(-32602, "Invalid params")
    rows = (
        db.query(PaymeTransaction)
        .filter(PaymeTransaction.payme_time_ms >= from_ms)
        .filter(PaymeTransaction.payme_time_ms <= to_ms)
        .order_by(PaymeTransaction.payme_time_ms.asc(), PaymeTransaction.id.asc())
        .all()
    )
    return {"transactions": [statement_transaction(row) for row in rows]}


PAYME_METHODS = {
    "CheckPerformTransaction": check_perform_transaction,
    "CreateTransaction": create_transaction,
    "PerformTransaction": perform_transaction,
    "CancelTransaction": cancel_transaction,
    "CheckTransaction": check_transaction,
    "GetStatement": get_statement,
}


PAYME_TEST_ACTIONS = {
    "check",
    "create",
    "perform",
    "cancel",
    "check_transaction",
    "get_statement",
    "wrong_amount",
    "missing_order",
    "invalid_auth",
    "unknown_method",
    "insufficient_balance",
}


def dispatch_payme_method(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    request_id = payload.get("id") if isinstance(payload, dict) else None
    method = payload.get("method") if isinstance(payload, dict) else None
    handler = PAYME_METHODS.get(method)
    if not handler:
        return jsonrpc_error(request_id, invalid_method_error())
    try:
        return jsonrpc_success(request_id, handler(db, payload))
    except PaymeError as exc:
        if db.is_active:
            db.rollback()
        return jsonrpc_error(request_id, exc)


def _test_body(request_id: int, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params or {},
    }


def _simulate_one(db: Session, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "request": sanitize_raw_request(body),
        "response": dispatch_payme_method(db, body),
    }


def _mark_order_test_environment(db: Session, order_ref: str) -> None:
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == order_ref).first()
    if order and getattr(order, "environment", None) != "test":
        order.environment = "test"
        order.updated_at = utcnow()
        db.add(order)
        db.commit()


def simulate_payme_test_action(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    action = str(payload.get("action") or "").strip()
    if action not in PAYME_TEST_ACTIONS:
        raise HTTPException(status_code=422, detail="unsupported_payme_test_action")

    order_ref = str(payload.get("order_ref") or "").strip()
    transaction_id = str(payload.get("transaction_id") or "").strip()
    try:
        amount_tiyin = int(payload.get("amount_tiyin"))
        payme_time_ms = int(payload.get("payme_time_ms"))
    except Exception:
        raise HTTPException(status_code=422, detail="invalid_payme_test_payload")
    reason = payload.get("reason")
    try:
        reason = int(reason) if reason is not None else 1
    except Exception:
        reason = 1

    if not order_ref or len(transaction_id) != 24 or amount_tiyin <= 0 or payme_time_ms <= 0:
        raise HTTPException(status_code=422, detail="invalid_payme_test_payload")

    _mark_order_test_environment(db, order_ref)
    account_order_ref = f"missing-{order_ref}" if action == "missing_order" else order_ref
    request_amount = amount_tiyin + 100 if action == "wrong_amount" else amount_tiyin

    check_body = _test_body(1, "CheckPerformTransaction", {
        "amount": request_amount,
        "account": {"order_id": account_order_ref},
    })
    create_body = _test_body(2, "CreateTransaction", {
        "id": transaction_id,
        "time": payme_time_ms,
        "amount": request_amount,
        "account": {"order_id": account_order_ref},
    })
    perform_body = _test_body(3, "PerformTransaction", {"id": transaction_id})
    cancel_body = _test_body(4, "CancelTransaction", {"id": transaction_id, "reason": reason})
    check_transaction_body = _test_body(5, "CheckTransaction", {"id": transaction_id})
    statement_body = _test_body(6, "GetStatement", {
        "from": payme_time_ms - 60000,
        "to": current_millis() + 60000,
    })

    if action == "invalid_auth":
        return {
            "action": action,
            "steps": [{
                "request": sanitize_raw_request(check_body),
                "response": jsonrpc_error(check_body.get("id"), access_denied_error()),
            }],
        }
    if action == "unknown_method":
        return {"action": action, "steps": [_simulate_one(db, _test_body(1, "UnknownMethod", {}))]}
    if action in {"check", "wrong_amount", "missing_order"}:
        return {"action": action, "steps": [_simulate_one(db, check_body)]}
    if action == "create":
        return {"action": action, "steps": [_simulate_one(db, create_body)]}
    if action == "perform":
        return {"action": action, "steps": [_simulate_one(db, perform_body)]}
    if action == "cancel":
        return {"action": action, "steps": [_simulate_one(db, cancel_body)]}
    if action == "check_transaction":
        return {"action": action, "steps": [_simulate_one(db, check_transaction_body)]}
    if action == "get_statement":
        return {"action": action, "steps": [_simulate_one(db, statement_body)]}
    if action == "insufficient_balance":
        return {
            "action": action,
            "steps": [
                _simulate_one(db, check_body),
                _simulate_one(db, create_body),
            ],
            "message": "Payment failed: insufficient card balance. PerformTransaction was not sent.",
        }

    raise HTTPException(status_code=422, detail="unsupported_payme_test_action")


def generate_order_ref(db: Session) -> str:
    for _ in range(40):
        ref = secrets.token_urlsafe(24)[:48]
        exists = db.query(PaymentOrder.id).filter(PaymentOrder.order_ref == ref).first()
        if not exists:
            return ref
    raise HTTPException(status_code=500, detail="payment_order_ref_generation_failed")


def build_checkout_url(order_ref: str, amount_tiyin: int) -> str:
    if not PAYME_MERCHANT_ID:
        raise HTTPException(status_code=503, detail="payme_merchant_id_not_configured")
    if not PAYME_CHECKOUT_BASE_URL:
        raise HTTPException(status_code=503, detail="payme_checkout_base_url_not_configured")
    params = f"m={PAYME_MERCHANT_ID};ac.order_id={order_ref};a={int(amount_tiyin)}"
    if PAYME_RETURN_URL:
        params = f"{params};c={PAYME_RETURN_URL}"
    encoded = base64.b64encode(params.encode("utf-8")).decode("ascii")
    return f"{PAYME_CHECKOUT_BASE_URL.rstrip('/')}/{quote_plus(encoded)}"


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
        payment_provider="payme",
        environment="production",
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
        "amount_tiyin": int(order.amount_tiyin),
        "checkout_url": build_checkout_url(order.order_ref, int(order.amount_tiyin)),
        "expires_at": order.expires_at.isoformat(),
    }
