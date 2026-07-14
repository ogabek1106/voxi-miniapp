import base64
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("PAYME_MERCHANT_ID", "test-merchant")
os.environ.setdefault("PAYME_SECRET_KEY", "test-secret")
os.environ.setdefault("PAYME_CHECKOUT_BASE_URL", "https://checkout.test.paycom.uz")
os.environ.setdefault("PAYME_RETURN_URL", "https://example.test/return")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import User
from app.models_payments import PaymentOrder, PaymeTransaction
from app.models_vcoins import CoinLedger, VCoinPaymentSettings
from app.services import payme_service


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


def _order(db, *, ref="order-1", coins=10, amount=5000000, status="pending"):
    now = datetime.now(timezone.utc)
    order = PaymentOrder(
        order_ref=ref,
        user_id=1,
        telegram_id=1001,
        product_type="vcoin",
        product_data={"type": "vcoin", "coins": coins},
        quote_snapshot={"coins": coins, "final_amount_uzs": amount // 100, "amount_tiyin": amount},
        amount_tiyin=amount,
        currency="UZS",
        payment_provider="payme",
        status=status,
        fulfillment_status="not_started",
        expires_at=now + timedelta(hours=12),
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _payload(method, params=None, request_id=1):
    return {"id": request_id, "method": method, "params": params or {}}


def _create_params(payme_id="123456789012345678901234", order_ref="order-1", amount=5000000, payme_time=1000):
    return {
        "id": payme_id,
        "time": payme_time,
        "amount": amount,
        "account": {"order_id": order_ref},
    }


def _dispatch(db, method, params=None):
    return payme_service.dispatch_payme_method(db, _payload(method, params))


def test_check_perform_transaction_success():
    db = _db()
    _order(db)
    result = _dispatch(db, "CheckPerformTransaction", {"amount": 5000000, "account": {"order_id": "order-1"}})
    assert result["result"] == {"allow": True}


def test_wrong_amount():
    db = _db()
    _order(db)
    result = _dispatch(db, "CheckPerformTransaction", {"amount": 1, "account": {"order_id": "order-1"}})
    assert result["error"]["code"] == -31001


def test_missing_order():
    db = _db()
    result = _dispatch(db, "CheckPerformTransaction", {"amount": 5000000, "account": {"order_id": "missing"}})
    assert result["error"]["code"] == -31050


def test_create_transaction_success():
    db = _db()
    _order(db)
    result = _dispatch(db, "CreateTransaction", _create_params())
    assert result["result"]["state"] == 1
    assert result["result"]["transaction"] == "1"


def test_duplicate_create_transaction():
    db = _db()
    _order(db)
    first = _dispatch(db, "CreateTransaction", _create_params())
    second = _dispatch(db, "CreateTransaction", _create_params())
    assert second["result"] == first["result"]


def test_second_active_transaction_blocked():
    db = _db()
    _order(db)
    _dispatch(db, "CreateTransaction", _create_params(payme_id="123456789012345678901234"))
    result = _dispatch(db, "CreateTransaction", _create_params(payme_id="abcdefghijklmnopqrstuvwx"))
    assert result["error"]["code"] == -31008


def test_perform_transaction_success():
    db = _db()
    _order(db, coins=7)
    _dispatch(db, "CreateTransaction", _create_params())
    result = _dispatch(db, "PerformTransaction", {"id": "123456789012345678901234"})
    assert result["result"]["state"] == 2
    user = db.query(User).filter(User.id == 1).first()
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == "order-1").first()
    assert user.v_coins == 7
    assert order.fulfillment_status == "fulfilled"
    assert order.fulfillment_ledger_id is not None


def test_duplicate_perform_transaction_does_not_add_vcoins_twice():
    db = _db()
    _order(db, coins=7)
    _dispatch(db, "CreateTransaction", _create_params())
    _dispatch(db, "PerformTransaction", {"id": "123456789012345678901234"})
    _dispatch(db, "PerformTransaction", {"id": "123456789012345678901234"})
    user = db.query(User).filter(User.id == 1).first()
    ledger_count = db.query(CoinLedger).count()
    assert user.v_coins == 7
    assert ledger_count == 1


def test_simulate_payme_marks_order_as_test():
    db = _db()
    order = _order(db, coins=2)
    result = payme_service.simulate_payme_test_action(db, {
        "action": "create",
        "order_ref": order.order_ref,
        "transaction_id": "abcdefghijklmnopqrstuvwx",
        "amount_tiyin": int(order.amount_tiyin),
        "payme_time_ms": 1000,
    })
    db.refresh(order)
    assert result["steps"][0]["response"]["result"]["state"] == 1
    assert order.environment == "test"


def test_cancel_before_perform_gives_state_minus_one():
    db = _db()
    _order(db)
    _dispatch(db, "CreateTransaction", _create_params())
    result = _dispatch(db, "CancelTransaction", {"id": "123456789012345678901234", "reason": 1})
    assert result["result"]["state"] == -1
    assert result["result"]["cancel_time"] > 0


def test_cancel_after_fulfilled_returns_minus_31007():
    db = _db()
    _order(db)
    _dispatch(db, "CreateTransaction", _create_params())
    _dispatch(db, "PerformTransaction", {"id": "123456789012345678901234"})
    result = _dispatch(db, "CancelTransaction", {"id": "123456789012345678901234", "reason": 1})
    assert result["error"]["code"] == -31007


def test_check_transaction():
    db = _db()
    _order(db)
    _dispatch(db, "CreateTransaction", _create_params())
    result = _dispatch(db, "CheckTransaction", {"id": "123456789012345678901234"})
    assert result["result"]["state"] == 1
    assert result["result"]["transaction"] == "1"


def test_get_statement_inclusive_range():
    db = _db()
    _order(db)
    _dispatch(db, "CreateTransaction", _create_params(payme_time=2000))
    result = _dispatch(db, "GetStatement", {"from": 2000, "to": 2000})
    assert len(result["result"]["transactions"]) == 1


def test_invalid_basic_auth():
    payme_service.PAYME_SECRET_KEY = "test-secret"
    header = "Basic " + base64.b64encode(b"Paycom:wrong").decode("ascii")
    assert payme_service.check_basic_auth(header) is False


def test_unknown_method():
    db = _db()
    result = _dispatch(db, "UnknownMethod", {})
    assert result["error"]["code"] == -32601
