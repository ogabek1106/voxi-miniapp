import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("CLICK_MERCHANT_ID", "123")
os.environ.setdefault("CLICK_SERVICE_ID", "456")
os.environ.setdefault("CLICK_SECRET_KEY", "click-secret")
os.environ.setdefault("CLICK_CHECKOUT_BASE_URL", "https://my.click.uz/services/pay/")
os.environ.setdefault("CLICK_RETURN_URL", "https://example.test/click-return")
os.environ.setdefault("CLICK_TEST_MODE", "false")
os.environ.setdefault("CLICK_TEST_MERCHANT_ID", "test_merchant")
os.environ.setdefault("CLICK_TEST_SERVICE_ID", "106870")
os.environ.setdefault("CLICK_TEST_SECRET_KEY", "test_secret")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import User
from app.models_click import ClickTransaction
from app.models_payments import PaymentOrder
from app.models_vcoins import CoinLedger, VCoinPaymentSettings
from app.services import click_service


def _db():
    engine = create_engine("sqlite:///:memory:")
    event.listen(engine, "connect", lambda connection, _: connection.create_function("char_length", 1, len))
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    session.add(VCoinPaymentSettings(id=1, exchange_rate_uzs=5000))
    session.add(User(id=1, telegram_id=1001, v_coins=0))
    session.commit()
    return session


def _order(db, *, ref="order-1", coins=10, amount_tiyin=5000000, status="pending", expired=False):
    now = datetime.now(timezone.utc)
    order = PaymentOrder(
        order_ref=ref,
        user_id=1,
        telegram_id=1001,
        product_type="vcoin",
        product_data={"type": "vcoin", "coins": coins},
        quote_snapshot={"coins": coins, "final_amount_uzs": amount_tiyin // 100, "amount_tiyin": amount_tiyin},
        amount_tiyin=amount_tiyin,
        currency="UZS",
        payment_provider="click",
        status=status,
        fulfillment_status="not_started",
        expires_at=now - timedelta(minutes=1) if expired else now + timedelta(hours=12),
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _prepare_fields(**overrides):
    fields = {
        "click_trans_id": "9001",
        "service_id": "456",
        "click_paydoc_id": "7001",
        "merchant_trans_id": "order-1",
        "amount": "50000.00",
        "action": "0",
        "error": "0",
        "error_note": "Success",
        "sign_time": "2026-07-13 12:00:00",
    }
    fields.update({key: str(value) for key, value in overrides.items()})
    fields["sign_string"] = click_service.sign_prepare(fields)
    return fields


def _complete_fields(merchant_prepare_id, **overrides):
    fields = {
        "click_trans_id": "9001",
        "service_id": "456",
        "click_paydoc_id": "7001",
        "merchant_trans_id": "order-1",
        "merchant_prepare_id": str(merchant_prepare_id),
        "amount": "50000.00",
        "action": "1",
        "error": "0",
        "error_note": "Success",
        "sign_time": "2026-07-13 12:01:00",
    }
    fields.update({key: str(value) for key, value in overrides.items()})
    fields["sign_string"] = click_service.sign_complete(fields)
    return fields


def _prepare(db, **overrides):
    return click_service.handle_prepare(db, _prepare_fields(**overrides))


def _complete(db, merchant_prepare_id, **overrides):
    return click_service.handle_complete(db, _complete_fields(merchant_prepare_id, **overrides))


def test_prepare_success():
    db = _db()
    _order(db)
    result = _prepare(db)
    assert result["error"] == 0
    assert result["click_trans_id"] == 9001
    assert result["merchant_trans_id"] == "order-1"
    assert result["merchant_prepare_id"] == 1


def test_wrong_signature():
    db = _db()
    _order(db)
    fields = _prepare_fields()
    fields["sign_string"] = "bad"
    result = click_service.handle_prepare(db, fields)
    assert result["error"] == -1


def test_wrong_amount():
    db = _db()
    _order(db)
    result = _prepare(db, amount="1.00")
    assert result["error"] == -2


def test_order_not_found():
    db = _db()
    result = _prepare(db, merchant_trans_id="missing")
    assert result["error"] == -5


def test_expired_order():
    db = _db()
    _order(db, expired=True)
    result = _prepare(db)
    assert result["error"] == -9
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == "order-1").first()
    assert order.status == "expired"


def test_duplicate_prepare():
    db = _db()
    _order(db)
    first = _prepare(db)
    second = _prepare(db)
    assert second == first
    assert db.query(ClickTransaction).count() == 1


def test_complete_success():
    db = _db()
    _order(db, coins=7)
    prepared = _prepare(db)
    result = _complete(db, prepared["merchant_prepare_id"])
    assert result["error"] == 0
    assert result["merchant_confirm_id"] == 1
    user = db.query(User).filter(User.id == 1).first()
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == "order-1").first()
    assert user.v_coins == 7
    assert order.status == "fulfilled"
    assert order.fulfillment_status == "fulfilled"
    assert order.fulfillment_ledger_id is not None


def test_duplicate_complete_does_not_add_vcoins_twice():
    db = _db()
    _order(db, coins=7)
    prepared = _prepare(db)
    _complete(db, prepared["merchant_prepare_id"])
    duplicate = _complete(db, prepared["merchant_prepare_id"])
    user = db.query(User).filter(User.id == 1).first()
    assert duplicate["error"] == 0
    assert user.v_coins == 7
    assert db.query(CoinLedger).count() == 1


def test_complete_without_prepare():
    db = _db()
    _order(db)
    result = _complete(db, 999)
    assert result["error"] == -6


def test_failed_complete_does_not_add_vcoins():
    db = _db()
    _order(db, coins=7)
    prepared = _prepare(db)
    result = _complete(db, prepared["merchant_prepare_id"], error="-5017", error_note="Cancelled")
    user = db.query(User).filter(User.id == 1).first()
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == "order-1").first()
    assert result["error"] == -9
    assert user.v_coins == 0
    assert db.query(CoinLedger).count() == 0
    assert order.status == "cancelled"


def test_wrong_action():
    db = _db()
    _order(db)
    result = _prepare(db, action="2")
    assert result["error"] == -3


def test_wrong_service_id():
    db = _db()
    _order(db)
    result = _prepare(db, service_id="999")
    assert result["error"] == -8


def test_checkout_requires_merchant_id(monkeypatch):
    db = _db()
    monkeypatch.setattr(click_service, "CLICK_MERCHANT_ID", "")
    try:
        click_service.create_vcoin_checkout_order(db, telegram_id=1001, coins=1)
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 503
        assert getattr(exc, "detail", None) == "click_merchant_id_not_configured"
    else:
        raise AssertionError("expected missing merchant id error")


def test_checkout_returns_safe_public_data():
    db = _db()
    result = click_service.create_vcoin_checkout_order(db, telegram_id=1001, coins=2)
    assert set(result) == {"order_ref", "amount", "checkout_url", "expires_at"}
    assert result["amount"] == "10000.00"
    assert "secret" not in result["checkout_url"].lower()
    assert "merchant_id=123" in result["checkout_url"]
    assert "service_id=456" in result["checkout_url"]
    assert f"transaction_param={result['order_ref']}" in result["checkout_url"]


def test_checkout_uses_test_variables_when_click_test_mode(monkeypatch):
    db = _db()
    monkeypatch.setattr(click_service, "CLICK_TEST_MODE", True)
    monkeypatch.setattr(click_service, "CLICK_TEST_MERCHANT_ID", "test_merchant")
    monkeypatch.setattr(click_service, "CLICK_TEST_SERVICE_ID", "106870")
    result = click_service.create_vcoin_checkout_order(db, telegram_id=1001, coins=1)
    assert "merchant_id=test_merchant" in result["checkout_url"]
    assert "service_id=106870" in result["checkout_url"]
    assert "secret" not in result["checkout_url"].lower()


def _simulate_payload(order, action="full_success", click_trans_id=321001, click_paydoc_id=654001):
    return {
        "telegram_id": 1001,
        "action": action,
        "order_ref": order.order_ref,
        "amount_tiyin": int(order.amount_tiyin),
        "click_trans_id": click_trans_id,
        "click_paydoc_id": click_paydoc_id,
    }


def test_simulate_click_full_success_and_duplicate_complete(monkeypatch):
    db = _db()
    monkeypatch.setattr(click_service, "CLICK_TEST_MODE", True)
    order = _order(db, coins=4)
    result = click_service.simulate_click_test_action(db, _simulate_payload(order, "duplicate_complete"))
    assert result["steps"][-1]["response"]["error"] == 0
    assert result["steps"][0]["request"]["sign_string"] == "<backend-generated>"
    user = db.query(User).filter(User.id == 1).first()
    db.refresh(order)
    assert user.v_coins == 4
    assert order.environment == "test"
    assert db.query(CoinLedger).count() == 1


def test_simulate_click_invalid_signature(monkeypatch):
    db = _db()
    monkeypatch.setattr(click_service, "CLICK_TEST_MODE", True)
    order = _order(db)
    result = click_service.simulate_click_test_action(db, _simulate_payload(order, "invalid_signature"))
    assert result["steps"][-1]["response"]["error"] == -1
    assert db.query(CoinLedger).count() == 0


def test_simulate_click_cancelled_complete_does_not_add_vcoins(monkeypatch):
    db = _db()
    monkeypatch.setattr(click_service, "CLICK_TEST_MODE", True)
    order = _order(db, coins=5)
    result = click_service.simulate_click_test_action(db, _simulate_payload(order, "cancelled_complete"))
    user = db.query(User).filter(User.id == 1).first()
    assert result["steps"][-1]["response"]["error"] == -9
    assert user.v_coins == 0
    assert db.query(CoinLedger).count() == 0


def test_balance_and_coinledger_updated_exactly_once():
    db = _db()
    _order(db, coins=3)
    prepared = _prepare(db)
    _complete(db, prepared["merchant_prepare_id"])
    _complete(db, prepared["merchant_prepare_id"])
    ledger = db.query(CoinLedger).one()
    user = db.query(User).filter(User.id == 1).first()
    assert ledger.delta == 3
    assert ledger.reason == "click_vcoin_purchase"
    assert user.v_coins == 3
