import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("PAYME_MERCHANT_ID", "payme-merchant")
os.environ.setdefault("PAYME_SECRET_KEY", "payme-secret")
os.environ.setdefault("PAYME_CHECKOUT_BASE_URL", "https://checkout.paycom.uz")
os.environ.setdefault("PAYME_RETURN_URL", "https://example.test/payme-return")
os.environ.setdefault("PAYME_TEST_MODE", "false")
os.environ.setdefault("CLICK_MERCHANT_ID", "123")
os.environ.setdefault("CLICK_SERVICE_ID", "456")
os.environ.setdefault("CLICK_SECRET_KEY", "click-secret")
os.environ.setdefault("CLICK_CHECKOUT_BASE_URL", "https://my.click.uz/services/pay/")
os.environ.setdefault("CLICK_RETURN_URL", "https://example.test/click-return")
os.environ.setdefault("CLICK_TEST_MODE", "false")
os.environ.setdefault("CLICK_TEST_MERCHANT_ID", "test_merchant")
os.environ.setdefault("CLICK_TEST_SERVICE_ID", "106870")
os.environ.setdefault("CLICK_TEST_SECRET_KEY", "test_secret")

from fastapi import HTTPException
from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.admin_transactions import require_admin
from app.db import Base
from app.models import User
from app.models_click import ClickTransaction
from app.models_payments import PaymentOrder, PaymeTransaction
from app.models_vcoins import CoinLedger, PaymentRequest
from app.services.admin_transactions_service import (
    get_transaction_detail,
    list_transactions,
    parse_filters,
    transactions_summary,
)


ADMIN_ID = 1150875355


def _db():
    engine = create_engine("sqlite:///:memory:")
    event.listen(engine, "connect", lambda connection, _: connection.create_function("char_length", 1, len))
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    db.add(User(id=1, telegram_id=1001, email="one@example.com", google_id="google-1", name="One", username="one", v_coins=40))
    db.add(User(id=2, telegram_id=1002, email="two@example.com", name="Two", username="two", v_coins=12))
    db.commit()
    return db


def _filters(**overrides):
    payload = {"telegram_id": ADMIN_ID}
    payload.update(overrides)
    return parse_filters(payload)


def _order(db, *, ref, provider="payme", product="vcoin", status="pending", fulfillment="not_started", amount=1000000, user_id=1, telegram_id=1001, created_offset=0):
    now = datetime.now(timezone.utc) + timedelta(minutes=created_offset)
    order = PaymentOrder(
        order_ref=ref,
        user_id=user_id,
        telegram_id=telegram_id,
        product_type=product,
        product_data={"type": product, "coins": 5, "secret_key": "never"},
        quote_snapshot={"final_amount_uzs": amount // 100},
        amount_tiyin=amount,
        currency="UZS",
        payment_provider=provider,
        status=status,
        fulfillment_status=fulfillment,
        payment_completed_at=now + timedelta(minutes=2) if status in {"paid", "fulfilled"} else None,
        fulfilled_at=now + timedelta(minutes=3) if fulfillment == "fulfilled" else None,
        cancelled_at=now + timedelta(minutes=4) if status == "cancelled" else None,
        expires_at=now + timedelta(hours=12),
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _payme(db, order, state=2):
    tx = PaymeTransaction(
        payme_transaction_id=f"payme{order.id:019d}"[:24],
        order_id=order.id,
        payme_time_ms=1000000 + order.id,
        amount_tiyin=order.amount_tiyin,
        state=state,
        reason=None,
        create_time_ms=100,
        perform_time_ms=200 if state == 2 else 0,
        cancel_time_ms=0,
        account={"order_id": order.order_ref},
        raw_create_request={"params": {"password": "hide", "account": {"order_id": order.order_ref}}},
        raw_perform_request={"params": {"id": "x"}},
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def _click(db, order, state="completed"):
    tx = ClickTransaction(
        click_trans_id=900000 + order.id,
        service_id=456,
        click_paydoc_id=700000 + order.id,
        merchant_trans_id=order.order_ref,
        merchant_prepare_id=order.id,
        merchant_confirm_id=order.id if state == "completed" else None,
        order_id=order.id,
        amount=str(order.amount_tiyin / 100),
        amount_tiyin=order.amount_tiyin,
        action=1,
        state=state,
        error=0,
        error_note="Success",
        sign_time="2026-07-14 10:00:00",
        raw_prepare_request={"sign_string": "hide", "merchant_trans_id": order.order_ref},
        raw_complete_request={"error": "0"},
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def _ledger(db, order):
    ledger = CoinLedger(
        telegram_id=order.telegram_id,
        delta=5,
        reason=f"{order.payment_provider}_vcoin_purchase",
        reference_type="payment_order",
        reference_id=str(order.id),
        balance_after=45,
    )
    db.add(ledger)
    db.commit()
    order.fulfillment_ledger_id = ledger.id
    db.add(order)
    db.commit()
    return ledger


def _manual(db, *, status="admin_confirmed", product="vcoin"):
    payment = PaymentRequest(
        telegram_id=1002,
        user_id=2,
        email="two@example.com",
        package_code="premiere-pack" if product == "premiere" else "vcoin-pack",
        expected_price="50000",
        coins_to_add=10,
        payment_token=f"MANUAL-{product.upper()}",
        final_amount=50000,
        status=status,
        confirmed_at=datetime.now(timezone.utc) if status == "admin_confirmed" else None,
        raw_payload={"product_type": product, "authorization": "hide"},
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def test_admin_only_access():
    require_admin(ADMIN_ID)
    try:
      require_admin(123)
    except HTTPException as exc:
      assert exc.status_code == 403
    else:
      raise AssertionError("expected admin rejection")


def test_list_pagination_and_newest_first_sorting():
    db = _db()
    old = _order(db, ref="old", created_offset=-5)
    new = _order(db, ref="new", created_offset=5)
    result = list_transactions(db, _filters(page_size=1))
    assert result["pagination"]["total"] == 2
    assert result["items"][0]["order_ref"] == new.order_ref


def test_provider_product_status_date_and_amount_filters():
    db = _db()
    paid = _order(db, ref="paid-click", provider="click", product="vcoin", status="fulfilled", fulfillment="fulfilled", amount=2000000)
    _click(db, paid)
    _order(db, ref="pending-payme", provider="payme", product="course", status="pending", amount=100000)
    assert [row["order_ref"] for row in list_transactions(db, _filters(provider="click"))["items"]] == ["paid-click"]
    assert [row["order_ref"] for row in list_transactions(db, _filters(product_type="course"))["items"]] == ["pending-payme"]
    assert [row["order_ref"] for row in list_transactions(db, _filters(order_status="fulfilled"))["items"]] == ["paid-click"]
    assert [row["order_ref"] for row in list_transactions(db, _filters(amount_min=15000))["items"]] == ["paid-click"]
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    assert list_transactions(db, _filters(created_from=future))["items"] == []


def test_summary_counts_paid_once_and_excludes_cancelled_revenue():
    db = _db()
    paid = _order(db, ref="paid", provider="payme", status="fulfilled", fulfillment="fulfilled", amount=3000000)
    _payme(db, paid)
    _ledger(db, paid)
    cancelled = _order(db, ref="cancelled", provider="payme", status="cancelled", amount=7000000)
    _payme(db, cancelled, state=-1)
    summary = transactions_summary(db, _filters())["summary"]
    assert summary["successful_revenue_tiyin"] == 3000000
    assert summary["payme_revenue_tiyin"] == 3000000
    assert summary["failed_cancelled_count"] == 1
    assert summary["fulfilled_count"] == 1


def test_detail_response_for_payme_and_no_secret_leakage():
    db = _db()
    order = _order(db, ref="payme-detail", provider="payme", status="fulfilled", fulfillment="fulfilled")
    _payme(db, order)
    detail = get_transaction_detail(db, "payme-detail", _filters())
    assert detail["detail"]["provider_transaction"]["provider"] == "payme"
    serialized = str(detail).lower()
    assert "never" not in serialized
    assert "hide" not in serialized


def test_detail_response_for_click():
    db = _db()
    order = _order(db, ref="click-detail", provider="click", status="fulfilled", fulfillment="fulfilled")
    _click(db, order)
    detail = get_transaction_detail(db, "click-detail", _filters())
    assert detail["detail"]["provider_transaction"]["provider"] == "click"
    assert detail["detail"]["provider_transaction"]["click_trans_id"]


def test_manual_payment_normalization_and_product_filtering():
    db = _db()
    _manual(db, product="premiere")
    _manual(db, product="vcoin")
    result = list_transactions(db, _filters(provider="manual", product_type="premiere"))
    assert len(result["items"]) == 1
    assert result["items"][0]["product_type"] == "premiere"
    assert result["items"][0]["provider"] == "manual"


def test_unknown_provider_and_product_fallback():
    db = _db()
    _order(db, ref="future", provider="futurepay", product="donation", status="paid")
    row = list_transactions(db, _filters(provider="futurepay"))["items"][0]
    assert row["provider"] == "futurepay"
    assert row["product_label"] == "Donation"
