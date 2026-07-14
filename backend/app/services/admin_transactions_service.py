from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.models import User
from app.models_click import ClickTransaction
from app.models_payments import PaymentOrder, PaymeTransaction
from app.models_vcoins import CoinLedger, PaymentRequest


PAID_ORDER_STATUSES = {"paid", "fulfilled"}
SUCCESSFUL_MANUAL_STATUSES = {"admin_confirmed"}
FAILED_ORDER_STATUSES = {"cancelled", "expired", "fulfillment_failed"}
FAILED_MANUAL_STATUSES = {"admin_rejected", "duplicate_suspected", "expired", "refunded"}
SECRET_KEYS = {
    "secret",
    "secret_key",
    "password",
    "authorization",
    "auth",
    "token",
    "payme_secret_key",
    "click_secret_key",
    "sign_string",
    "sms_code",
    "card_number",
    "pan",
}


@dataclass
class TransactionFilters:
    telegram_id: int
    page: int = 1
    page_size: int = 25
    sort_by: str = "created_at"
    sort_dir: str = "desc"
    q: str | None = None
    order_ref: str | None = None
    provider: str | None = None
    product_type: str | None = None
    order_status: str | None = None
    fulfillment_status: str | None = None
    provider_state: str | None = None
    filter_telegram_id: int | None = None
    user_id: int | None = None
    amount_min: int | None = None
    amount_max: int | None = None
    created_from: datetime | None = None
    created_to: datetime | None = None
    paid_from: datetime | None = None
    paid_to: datetime | None = None
    fulfilled_only: bool = False
    failed_only: bool = False
    cancelled_only: bool = False
    expired_only: bool = False


def parse_bool(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def parse_datetime(value: Any) -> datetime | None:
    cleaned = str(value or "").strip()
    if not cleaned:
        return None
    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_datetime_filter")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_filters(params: dict[str, Any]) -> TransactionFilters:
    def as_int(name: str, default: int | None = None) -> int | None:
        raw = params.get(name)
        if raw in (None, ""):
            return default
        try:
            return int(raw)
        except Exception:
            raise HTTPException(status_code=422, detail=f"invalid_{name}")

    page_size = max(1, min(100, as_int("page_size", 25) or 25))
    return TransactionFilters(
        telegram_id=int(as_int("telegram_id") or 0),
        page=max(1, as_int("page", 1) or 1),
        page_size=page_size,
        sort_by=str(params.get("sort_by") or "created_at").strip() or "created_at",
        sort_dir=str(params.get("sort_dir") or "desc").strip().lower(),
        q=_clean(params.get("q")),
        order_ref=_clean(params.get("order_ref")),
        provider=_clean(params.get("provider")),
        product_type=_clean(params.get("product_type")),
        order_status=_clean(params.get("order_status")),
        fulfillment_status=_clean(params.get("fulfillment_status")),
        provider_state=_clean(params.get("provider_state")),
        filter_telegram_id=as_int("filter_telegram_id"),
        user_id=as_int("user_id"),
        amount_min=as_int("amount_min"),
        amount_max=as_int("amount_max"),
        created_from=parse_datetime(params.get("created_from")),
        created_to=parse_datetime(params.get("created_to")),
        paid_from=parse_datetime(params.get("paid_from")),
        paid_to=parse_datetime(params.get("paid_to")),
        fulfilled_only=parse_bool(params.get("fulfilled_only")),
        failed_only=parse_bool(params.get("failed_only")),
        cancelled_only=parse_bool(params.get("cancelled_only")),
        expired_only=parse_bool(params.get("expired_only")),
    )


def list_transactions(db: Session, filters: TransactionFilters) -> dict[str, Any]:
    rows = _matching_rows(db, filters, include_raw=False)
    rows = _sort_rows(rows, filters.sort_by, filters.sort_dir)
    total = len(rows)
    start = (filters.page - 1) * filters.page_size
    page_rows = rows[start:start + filters.page_size]
    return {
        "ok": True,
        "items": page_rows,
        "pagination": {
            "page": filters.page,
            "page_size": filters.page_size,
            "total": total,
            "total_pages": (total + filters.page_size - 1) // filters.page_size if total else 0,
        },
    }


def transactions_summary(db: Session, filters: TransactionFilters) -> dict[str, Any]:
    rows = _matching_rows(db, filters, include_raw=False)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    summary = {
        "total_count": len(rows),
        "successful_revenue_tiyin": 0,
        "pending_amount_tiyin": 0,
        "failed_cancelled_count": 0,
        "fulfilled_count": 0,
        "click_revenue_tiyin": 0,
        "payme_revenue_tiyin": 0,
        "manual_revenue_tiyin": 0,
        "vcoin_sales_tiyin": 0,
        "other_product_sales_tiyin": 0,
        "today_successful_revenue_tiyin": 0,
        "last_7_days_successful_revenue_tiyin": 0,
        "last_30_days_successful_revenue_tiyin": 0,
    }
    for row in rows:
        amount = int(row["amount"]["tiyin"] or 0)
        paid = _row_is_paid(row)
        created_at = _parse_iso(row.get("created_at"))
        paid_at = _parse_iso(row.get("paid_at"))
        metric_time = paid_at or created_at
        if paid:
            summary["successful_revenue_tiyin"] += amount
            provider_key = f"{row.get('provider')}_revenue_tiyin"
            if provider_key in summary:
                summary[provider_key] += amount
            if row.get("product_type") == "vcoin":
                summary["vcoin_sales_tiyin"] += amount
            else:
                summary["other_product_sales_tiyin"] += amount
            if metric_time and metric_time >= today_start:
                summary["today_successful_revenue_tiyin"] += amount
            if metric_time and metric_time >= now - timedelta(days=7):
                summary["last_7_days_successful_revenue_tiyin"] += amount
            if metric_time and metric_time >= now - timedelta(days=30):
                summary["last_30_days_successful_revenue_tiyin"] += amount
        elif row.get("order_status") in {"pending", "duplicate_suspected"}:
            summary["pending_amount_tiyin"] += amount
        if row.get("order_status") in FAILED_ORDER_STATUSES or row.get("provider_state") in FAILED_MANUAL_STATUSES:
            summary["failed_cancelled_count"] += 1
        if row.get("fulfillment_status") == "fulfilled":
            summary["fulfilled_count"] += 1
    return {"ok": True, "summary": summary}


def get_transaction_detail(db: Session, order_ref: str, filters: TransactionFilters) -> dict[str, Any]:
    key = str(order_ref or "").strip()
    if not key:
        raise HTTPException(status_code=404, detail="transaction_not_found")

    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == key).first()
    if order:
        user = db.query(User).filter(User.id == order.user_id).first()
        payme = _latest_payme_for_order(db, order.id)
        click = _latest_click_for_order(db, order.id)
        ledger = db.query(CoinLedger).filter(CoinLedger.id == order.fulfillment_ledger_id).first() if order.fulfillment_ledger_id else None
        row = _normalize_order(order, user, payme, click, ledger, include_raw=True)
        return {
            "ok": True,
            "transaction": row,
            "detail": {
                "order": _safe_json({
                    "id": order.id,
                    "order_ref": order.order_ref,
                    "payment_provider": order.payment_provider,
                    "product_type": order.product_type,
                    "product_data": order.product_data,
                    "quote_snapshot": order.quote_snapshot,
                    "amount_tiyin": order.amount_tiyin,
                    "currency": order.currency,
                    "status": order.status,
                    "fulfillment_status": order.fulfillment_status,
                    "fulfillment_error": order.fulfillment_error,
                    "payment_completed_at": _iso(order.payment_completed_at),
                    "fulfilled_at": _iso(order.fulfilled_at),
                    "cancelled_at": _iso(order.cancelled_at),
                    "expires_at": _iso(order.expires_at),
                    "created_at": _iso(order.created_at),
                    "updated_at": _iso(order.updated_at),
                    "is_expired": bool(order.expires_at and _as_utc(order.expires_at) <= datetime.now(timezone.utc)),
                }),
                "user": _serialize_user(user),
                "provider_transaction": _provider_detail(payme, click, None),
                "fulfillment": _fulfillment_detail(order, ledger),
                "raw_data": _safe_json({
                    "payme": _payme_raw(payme),
                    "click": _click_raw(click),
                    "order_product_data": order.product_data,
                    "order_quote_snapshot": order.quote_snapshot,
                }),
            },
        }

    manual = db.query(PaymentRequest).filter(PaymentRequest.payment_token == key).first()
    if not manual and key.isdigit():
        manual = db.query(PaymentRequest).filter(PaymentRequest.id == int(key)).first()
    if not manual:
        raise HTTPException(status_code=404, detail="transaction_not_found")
    user = _manual_user(db, manual)
    ledger = _manual_ledger(db, manual)
    row = _normalize_manual(manual, user, ledger, include_raw=True)
    return {
        "ok": True,
        "transaction": row,
        "detail": {
            "order": None,
            "user": _serialize_user(user),
            "provider_transaction": _provider_detail(None, None, manual),
            "fulfillment": _manual_fulfillment_detail(manual, ledger),
            "raw_data": _safe_json({"manual_payment_request": _manual_raw(manual)}),
        },
    }


def _matching_rows(db: Session, filters: TransactionFilters, *, include_raw: bool) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    order_query = _filtered_order_query(db, filters)
    for order, user in order_query.all():
        payme = _latest_payme_for_order(db, order.id)
        click = _latest_click_for_order(db, order.id)
        ledger = db.query(CoinLedger).filter(CoinLedger.id == order.fulfillment_ledger_id).first() if order.fulfillment_ledger_id else None
        row = _normalize_order(order, user, payme, click, ledger, include_raw=include_raw)
        if _matches_row_filters(row, filters) and _matches_text(row, filters):
            rows.append(row)

    if not filters.provider or filters.provider == "manual":
        for manual in _filtered_manual_query(db, filters).all():
            user = _manual_user(db, manual)
            ledger = _manual_ledger(db, manual)
            row = _normalize_manual(manual, user, ledger, include_raw=include_raw)
            if _matches_row_filters(row, filters) and _matches_text(row, filters):
                rows.append(row)
    return rows


def _filtered_order_query(db: Session, filters: TransactionFilters):
    query = db.query(PaymentOrder, User).outerjoin(User, User.id == PaymentOrder.user_id)
    if filters.provider and filters.provider != "manual":
        query = query.filter(PaymentOrder.payment_provider == filters.provider)
    elif filters.provider == "manual":
        query = query.filter(False)
    if filters.product_type:
        query = query.filter(PaymentOrder.product_type == filters.product_type)
    if filters.order_status:
        query = query.filter(PaymentOrder.status == filters.order_status)
    if filters.fulfillment_status:
        query = query.filter(PaymentOrder.fulfillment_status == filters.fulfillment_status)
    if filters.order_ref:
        query = query.filter(PaymentOrder.order_ref.ilike(f"%{filters.order_ref}%"))
    if filters.filter_telegram_id:
        query = query.filter(PaymentOrder.telegram_id == filters.filter_telegram_id)
    if filters.user_id:
        query = query.filter(PaymentOrder.user_id == filters.user_id)
    if filters.amount_min is not None:
        query = query.filter(PaymentOrder.amount_tiyin >= filters.amount_min * 100)
    if filters.amount_max is not None:
        query = query.filter(PaymentOrder.amount_tiyin <= filters.amount_max * 100)
    if filters.created_from:
        query = query.filter(PaymentOrder.created_at >= filters.created_from)
    if filters.created_to:
        query = query.filter(PaymentOrder.created_at <= filters.created_to)
    if filters.paid_from:
        query = query.filter(PaymentOrder.payment_completed_at >= filters.paid_from)
    if filters.paid_to:
        query = query.filter(PaymentOrder.payment_completed_at <= filters.paid_to)
    if filters.fulfilled_only:
        query = query.filter(PaymentOrder.fulfillment_status == "fulfilled")
    if filters.failed_only:
        query = query.filter(PaymentOrder.status.in_(["cancelled", "expired", "fulfillment_failed"]))
    if filters.cancelled_only:
        query = query.filter(PaymentOrder.status == "cancelled")
    if filters.expired_only:
        query = query.filter(PaymentOrder.status == "expired")
    return query


def _filtered_manual_query(db: Session, filters: TransactionFilters):
    query = db.query(PaymentRequest)
    if filters.product_type and filters.product_type not in {"vcoin", "premiere"}:
        query = query.filter(False)
    if filters.order_status:
        query = query.filter(PaymentRequest.status == filters.order_status)
    if filters.fulfillment_status:
        if filters.fulfillment_status == "fulfilled":
            query = query.filter(PaymentRequest.status == "admin_confirmed")
        elif filters.fulfillment_status == "failed":
            query = query.filter(PaymentRequest.status.in_(["admin_rejected", "expired", "refunded"]))
        else:
            query = query.filter(False)
    if filters.order_ref:
        query = query.filter(or_(PaymentRequest.payment_token.ilike(f"%{filters.order_ref}%"), cast(PaymentRequest.id, String).ilike(f"%{filters.order_ref}%")))
    if filters.filter_telegram_id:
        query = query.filter(PaymentRequest.telegram_id == filters.filter_telegram_id)
    if filters.user_id:
        query = query.filter(PaymentRequest.user_id == filters.user_id)
    if filters.amount_min is not None:
        query = query.filter(PaymentRequest.final_amount >= filters.amount_min)
    if filters.amount_max is not None:
        query = query.filter(PaymentRequest.final_amount <= filters.amount_max)
    if filters.created_from:
        query = query.filter(PaymentRequest.created_at >= filters.created_from)
    if filters.created_to:
        query = query.filter(PaymentRequest.created_at <= filters.created_to)
    if filters.paid_from:
        query = query.filter(PaymentRequest.confirmed_at >= filters.paid_from)
    if filters.paid_to:
        query = query.filter(PaymentRequest.confirmed_at <= filters.paid_to)
    if filters.fulfilled_only:
        query = query.filter(PaymentRequest.status == "admin_confirmed")
    if filters.failed_only:
        query = query.filter(PaymentRequest.status.in_(["admin_rejected", "duplicate_suspected", "expired", "refunded"]))
    if filters.cancelled_only:
        query = query.filter(PaymentRequest.status.in_(["admin_rejected", "refunded"]))
    if filters.expired_only:
        query = query.filter(PaymentRequest.status == "expired")
    return query


def _normalize_order(order: PaymentOrder, user: User | None, payme: PaymeTransaction | None, click: ClickTransaction | None, ledger: CoinLedger | None, *, include_raw: bool) -> dict[str, Any]:
    provider = _clean(order.payment_provider) or "unknown"
    provider_id = None
    provider_state = None
    source = "production"
    if provider == "payme" and payme:
        provider_id = payme.payme_transaction_id
        provider_state = _payme_state_label(payme.state)
    elif provider == "click" and click:
        provider_id = str(click.click_trans_id)
        provider_state = click.state
    amount_tiyin = int(order.amount_tiyin or 0)
    product_type = _clean(order.product_type) or "unknown"
    row = {
        "row_key": f"order:{order.id}",
        "order_id": order.id,
        "order_ref": order.order_ref,
        "provider": provider,
        "provider_transaction_id": provider_id,
        "provider_state": provider_state,
        "product_type": product_type,
        "product_label": _product_label(product_type, order.product_data),
        "product_description": _product_description(product_type, order.product_data, order.quote_snapshot),
        "user": _serialize_user(user, order.user_id, order.telegram_id),
        "amount": _amount(amount_tiyin, order.currency),
        "currency": order.currency or "UZS",
        "order_status": order.status,
        "fulfillment_status": order.fulfillment_status,
        "created_at": _iso(order.created_at),
        "paid_at": _iso(order.payment_completed_at),
        "fulfilled_at": _iso(order.fulfilled_at),
        "cancelled_at": _iso(order.cancelled_at),
        "expires_at": _iso(order.expires_at),
        "payment_age_seconds": _duration_seconds(order.created_at, order.payment_completed_at or order.cancelled_at or order.fulfilled_at),
        "source": source,
        "fulfillment_ledger_id": order.fulfillment_ledger_id,
        "vcoins_granted": ledger.delta if ledger else _product_coins(order.product_data),
    }
    if include_raw:
        row["raw"] = _safe_json({"product_data": order.product_data, "quote_snapshot": order.quote_snapshot})
    return row


def _normalize_manual(payment: PaymentRequest, user: User | None, ledger: CoinLedger | None, *, include_raw: bool) -> dict[str, Any]:
    product_type = "premiere" if _manual_is_premiere(payment) else "vcoin"
    amount_tiyin = int(payment.final_amount or payment.subtotal_amount or 0) * 100
    order_ref = payment.payment_token or str(payment.id)
    row = {
        "row_key": f"manual:{payment.id}",
        "order_id": None,
        "manual_payment_id": payment.id,
        "order_ref": order_ref,
        "provider": "manual",
        "provider_transaction_id": payment.payment_token or str(payment.id),
        "provider_state": payment.status,
        "product_type": product_type,
        "product_label": _product_label(product_type, {"coins": payment.coins_to_add, "package_code": payment.package_code}),
        "product_description": _manual_product_description(payment, product_type),
        "user": _serialize_user(user, payment.user_id, payment.telegram_id, payment.email),
        "amount": _amount(amount_tiyin, "UZS"),
        "currency": "UZS",
        "order_status": payment.status,
        "fulfillment_status": "fulfilled" if payment.status == "admin_confirmed" else ("failed" if payment.status in FAILED_MANUAL_STATUSES else "not_started"),
        "created_at": _iso(payment.created_at),
        "paid_at": _iso(payment.confirmed_at),
        "fulfilled_at": _iso(payment.confirmed_at),
        "cancelled_at": _iso(payment.rejected_at),
        "expires_at": _iso(payment.expires_at),
        "payment_age_seconds": _duration_seconds(payment.created_at, payment.confirmed_at or payment.rejected_at),
        "source": "manual",
        "fulfillment_ledger_id": ledger.id if ledger else None,
        "vcoins_granted": ledger.delta if ledger else (payment.coins_to_add if product_type == "vcoin" and payment.status == "admin_confirmed" else None),
    }
    if include_raw:
        row["raw"] = _safe_json({"raw_payload": payment.raw_payload})
    return row


def _sort_rows(rows: list[dict[str, Any]], sort_by: str, sort_dir: str) -> list[dict[str, Any]]:
    allowed = {"created_at", "paid_at", "fulfilled_at", "amount", "provider", "product_type", "order_status"}
    key_name = sort_by if sort_by in allowed else "created_at"
    reverse = sort_dir != "asc"

    def key(row: dict[str, Any]):
        if key_name == "amount":
            return int(row.get("amount", {}).get("tiyin") or 0)
        value = row.get(key_name)
        if key_name.endswith("_at"):
            return _parse_iso(value) or datetime.min.replace(tzinfo=timezone.utc)
        return str(value or "")

    return sorted(rows, key=key, reverse=reverse)


def _matches_text(row: dict[str, Any], filters: TransactionFilters) -> bool:
    if not filters.q:
        return True
    q = filters.q.lower()
    user = row.get("user") or {}
    haystack = " ".join(str(part or "") for part in [
        row.get("order_ref"),
        row.get("provider_transaction_id"),
        row.get("provider"),
        row.get("product_type"),
        row.get("product_description"),
        user.get("id"),
        user.get("telegram_id"),
        user.get("display_name"),
        user.get("email"),
        user.get("username"),
    ]).lower()
    return q in haystack


def _matches_row_filters(row: dict[str, Any], filters: TransactionFilters) -> bool:
    if filters.provider_state and str(row.get("provider_state") or "") != filters.provider_state:
        return False
    if filters.product_type and str(row.get("product_type") or "") != filters.product_type:
        return False
    return True


def _row_is_paid(row: dict[str, Any]) -> bool:
    if row.get("provider") == "manual":
        return row.get("provider_state") in SUCCESSFUL_MANUAL_STATUSES
    return row.get("order_status") in PAID_ORDER_STATUSES


def _latest_payme_for_order(db: Session, order_id: int) -> PaymeTransaction | None:
    return db.query(PaymeTransaction).filter(PaymeTransaction.order_id == order_id).order_by(PaymeTransaction.id.desc()).first()


def _latest_click_for_order(db: Session, order_id: int) -> ClickTransaction | None:
    return db.query(ClickTransaction).filter(ClickTransaction.order_id == order_id).order_by(ClickTransaction.id.desc()).first()


def _manual_user(db: Session, payment: PaymentRequest) -> User | None:
    if payment.user_id:
        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            return user
    if payment.telegram_id:
        user = db.query(User).filter(User.telegram_id == payment.telegram_id).first()
        if user:
            return user
    if payment.email:
        return db.query(User).filter(User.email == payment.email).first()
    return None


def _manual_ledger(db: Session, payment: PaymentRequest) -> CoinLedger | None:
    return (
        db.query(CoinLedger)
        .filter(CoinLedger.reference_type == "payment_request")
        .filter(CoinLedger.reference_id == str(payment.id))
        .order_by(CoinLedger.id.desc())
        .first()
    )


def _serialize_user(user: User | None, user_id: int | None = None, telegram_id: int | None = None, email: str | None = None) -> dict[str, Any]:
    if not user:
        return {
            "id": user_id,
            "telegram_id": telegram_id,
            "display_name": None,
            "username": None,
            "email": email,
            "google_id": None,
            "v_coins": None,
            "photo_url": None,
        }
    display_name = " ".join(part for part in [user.name, user.surname] if part).strip() or user.username or user.email
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "display_name": display_name,
        "username": user.username,
        "email": user.email,
        "google_id": user.google_id,
        "v_coins": user.v_coins,
        "photo_url": user.photo_url,
    }


def _provider_detail(payme: PaymeTransaction | None, click: ClickTransaction | None, manual: PaymentRequest | None) -> dict[str, Any] | None:
    if payme:
        return _safe_json({
            "provider": "payme",
            "internal_transaction_id": payme.id,
            "payme_transaction_id": payme.payme_transaction_id,
            "state": payme.state,
            "state_label": _payme_state_label(payme.state),
            "reason": payme.reason,
            "amount_tiyin": payme.amount_tiyin,
            "amount_uzs": _tiyin_to_uzs(payme.amount_tiyin),
            "payme_time_ms": payme.payme_time_ms,
            "create_time_ms": payme.create_time_ms,
            "perform_time_ms": payme.perform_time_ms,
            "cancel_time_ms": payme.cancel_time_ms,
            "account": payme.account,
            "created_at": _iso(payme.created_at),
            "updated_at": _iso(payme.updated_at),
            "raw": _payme_raw(payme),
        })
    if click:
        return _safe_json({
            "provider": "click",
            "internal_transaction_id": click.id,
            "click_trans_id": click.click_trans_id,
            "click_paydoc_id": click.click_paydoc_id,
            "merchant_prepare_id": click.merchant_prepare_id,
            "merchant_confirm_id": click.merchant_confirm_id,
            "action": click.action,
            "state": click.state,
            "error": click.error,
            "error_note": click.error_note,
            "amount": str(click.amount),
            "amount_tiyin": click.amount_tiyin,
            "service_id": click.service_id,
            "prepared_at": _iso(click.prepared_at),
            "completed_at": _iso(click.completed_at),
            "cancelled_at": _iso(click.cancelled_at),
            "created_at": _iso(click.created_at),
            "updated_at": _iso(click.updated_at),
            "raw": _click_raw(click),
        })
    if manual:
        return _safe_json({
            "provider": "manual",
            "payment_request_id": manual.id,
            "payment_token": manual.payment_token,
            "submitted_amount": manual.final_amount or manual.expected_price,
            "receipt_file_id": manual.receipt_file_id,
            "receipt_image_hash": manual.receipt_image_hash,
            "admin_id": manual.admin_id,
            "status": manual.status,
            "created_at": _iso(manual.created_at),
            "confirmed_at": _iso(manual.confirmed_at),
            "rejected_at": _iso(manual.rejected_at),
            "reject_reason": manual.reject_reason,
            "raw": _manual_raw(manual),
        })
    return None


def _fulfillment_detail(order: PaymentOrder, ledger: CoinLedger | None) -> dict[str, Any]:
    return _safe_json({
        "fulfillment_status": order.fulfillment_status,
        "fulfillment_error": order.fulfillment_error,
        "fulfillment_ledger_id": order.fulfillment_ledger_id,
        "fulfilled_at": _iso(order.fulfilled_at),
        "ledger": _ledger_json(ledger),
        "duplicate_protection": {
            "payment_order_id": order.id,
            "ledger_reference_type": "payment_order",
            "ledger_reference_id": str(order.id),
        },
    })


def _manual_fulfillment_detail(payment: PaymentRequest, ledger: CoinLedger | None) -> dict[str, Any]:
    return _safe_json({
        "fulfillment_status": "fulfilled" if payment.status == "admin_confirmed" else "not_started",
        "coins_to_add": payment.coins_to_add,
        "confirmed_at": _iso(payment.confirmed_at),
        "ledger": _ledger_json(ledger),
        "duplicate_protection": {
            "payment_request_id": payment.id,
            "ledger_reference_type": "payment_request",
            "ledger_reference_id": str(payment.id),
        },
    })


def _ledger_json(ledger: CoinLedger | None) -> dict[str, Any] | None:
    if not ledger:
        return None
    return {
        "id": ledger.id,
        "telegram_id": ledger.telegram_id,
        "delta": ledger.delta,
        "reason": ledger.reason,
        "reference_type": ledger.reference_type,
        "reference_id": ledger.reference_id,
        "balance_after": ledger.balance_after,
        "created_at": _iso(ledger.created_at),
    }


def _payme_raw(payme: PaymeTransaction | None) -> dict[str, Any] | None:
    if not payme:
        return None
    return _safe_json({
        "raw_create_request": payme.raw_create_request,
        "raw_perform_request": payme.raw_perform_request,
        "raw_cancel_request": payme.raw_cancel_request,
        "raw_check_request": payme.raw_check_request,
    })


def _click_raw(click: ClickTransaction | None) -> dict[str, Any] | None:
    if not click:
        return None
    return _safe_json({
        "raw_prepare_request": click.raw_prepare_request,
        "raw_complete_request": click.raw_complete_request,
    })


def _manual_raw(payment: PaymentRequest) -> dict[str, Any]:
    return _safe_json({
        "raw_payload": payment.raw_payload,
        "package_code": payment.package_code,
        "expected_price": payment.expected_price,
        "promo_code": payment.promo_code,
        "discount_percent": payment.discount_percent,
        "discount_amount": payment.discount_amount,
        "final_amount": payment.final_amount,
    })


def _safe_json(value: Any) -> Any:
    if isinstance(value, dict):
        safe = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if lowered in SECRET_KEYS or any(secret in lowered for secret in ("secret", "authorization", "password")):
                safe[key] = "<redacted>"
            else:
                safe[key] = _safe_json(item)
        return safe
    if isinstance(value, list):
        return [_safe_json(item) for item in value]
    return value


def _product_label(product_type: str, data: dict[str, Any] | None) -> str:
    labels = {
        "vcoin": "V-Coin purchase",
        "premiere": "Premiere access",
        "donation": "Donation",
        "course": "Course purchase",
        "mock": "Mock access",
    }
    return labels.get(product_type or "unknown", f"{product_type or 'Unknown'} product")


def _product_description(product_type: str, data: dict[str, Any] | None, quote: dict[str, Any] | None) -> str:
    data = data or {}
    if product_type == "vcoin":
        return f"{int(data.get('coins') or 0)} V-Coins"
    if product_type == "premiere":
        return str(data.get("label") or data.get("title") or "Premiere access")
    return str(data.get("description") or data.get("label") or data.get("title") or _product_label(product_type, data))


def _manual_product_description(payment: PaymentRequest, product_type: str) -> str:
    if product_type == "premiere":
        return payment.package_code or "Premiere manual payment"
    return f"{int(payment.coins_to_add or 0)} V-Coins"


def _manual_is_premiere(payment: PaymentRequest) -> bool:
    payload = payment.raw_payload or {}
    return str(payload.get("product_type") or payload.get("type") or payment.package_code or "").lower().startswith("premiere")


def _amount(tiyin: int, currency: str | None) -> dict[str, Any]:
    return {
        "tiyin": int(tiyin or 0),
        "uzs": _tiyin_to_uzs(tiyin),
        "currency": currency or "UZS",
    }


def _tiyin_to_uzs(tiyin: int | None) -> str:
    return str((Decimal(int(tiyin or 0)) / Decimal("100")).quantize(Decimal("0.01")))


def _payme_state_label(state: Any) -> str:
    return {
        1: "created",
        2: "performed",
        -1: "cancelled_before_perform",
        -2: "cancelled_after_perform",
    }.get(int(state or 0), f"unknown_{state}")


def _product_coins(data: dict[str, Any] | None) -> int | None:
    try:
        coins = int((data or {}).get("coins") or 0)
        return coins or None
    except Exception:
        return None


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _iso(value: datetime | None) -> str | None:
    if not value:
        return None
    return _as_utc(value).isoformat()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _duration_seconds(start: datetime | None, end: datetime | None) -> int | None:
    if not start or not end:
        return None
    return max(0, int((_as_utc(end) - _as_utc(start)).total_seconds()))


def _clean(value: Any) -> str | None:
    cleaned = str(value or "").strip()
    return cleaned or None
