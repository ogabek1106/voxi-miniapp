import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.api.payment_orders import payment_order_status
from app.db import Base
from app.models import User
from app.models_payments import PaymentOrder


def _db():
    engine = create_engine("sqlite:///:memory:")
    event.listen(engine, "connect", lambda connection, _: connection.create_function("char_length", 1, len))
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    db.add(User(id=1, telegram_id=1001, v_coins=0))
    db.add(User(id=2, telegram_id=2002, v_coins=0))
    db.commit()
    return db


def _order(db, *, status="pending", fulfillment_status="not_started"):
    now = datetime.now(timezone.utc)
    order = PaymentOrder(
        order_ref=f"order-{status}-{fulfillment_status}",
        user_id=1,
        telegram_id=1001,
        product_type="vcoin",
        product_data={"type": "vcoin", "coins": 1},
        quote_snapshot={"coins": 1, "final_amount_uzs": 5000, "amount_tiyin": 500000},
        amount_tiyin=500000,
        currency="UZS",
        payment_provider="click",
        environment="production",
        status=status,
        fulfillment_status=fulfillment_status,
        payment_completed_at=now if status in {"paid", "fulfilled"} else None,
        fulfilled_at=now if fulfillment_status == "fulfilled" else None,
        expires_at=now + timedelta(hours=12),
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_order_status_rejects_another_user():
    db = _db()
    order = _order(db)
    try:
        payment_order_status(order.order_ref, telegram_id=2002, db=db)
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("expected forbidden order status")


def test_order_status_returns_pending():
    db = _db()
    order = _order(db)
    result = payment_order_status(order.order_ref, telegram_id=1001, db=db)
    assert result == {
        "order_ref": order.order_ref,
        "provider": "click",
        "status": "pending",
        "fulfillment_status": "not_started",
        "paid_at": None,
        "fulfilled_at": None,
    }


def test_order_status_returns_fulfilled():
    db = _db()
    order = _order(db, status="fulfilled", fulfillment_status="fulfilled")
    result = payment_order_status(order.order_ref, telegram_id=1001, db=db)
    assert result["status"] == "fulfilled"
    assert result["fulfillment_status"] == "fulfilled"
    assert result["paid_at"]
    assert result["fulfilled_at"]
