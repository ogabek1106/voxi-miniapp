from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    __table_args__ = (
        UniqueConstraint("order_ref", name="uq_payment_orders_order_ref"),
        UniqueConstraint("fulfillment_ledger_id", name="uq_payment_orders_fulfillment_ledger_id"),
        CheckConstraint("amount_tiyin > 0", name="ck_payment_orders_amount_positive"),
        CheckConstraint("product_type <> ''", name="ck_payment_orders_product_type_not_empty"),
        CheckConstraint("currency = 'UZS'", name="ck_payment_orders_currency_uzs"),
        CheckConstraint(
            "status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'expired', 'fulfillment_failed')",
            name="ck_payment_orders_status",
        ),
        CheckConstraint(
            "fulfillment_status IN ('not_started', 'processing', 'fulfilled', 'failed')",
            name="ck_payment_orders_fulfillment_status",
        ),
        CheckConstraint(
            "environment IN ('production', 'test')",
            name="ck_payment_orders_environment",
        ),
        Index("ix_payment_orders_user_status", "user_id", "status"),
        Index("ix_payment_orders_product_status", "product_type", "status"),
        Index("ix_payment_orders_environment_provider_status", "environment", "payment_provider", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    order_ref = Column(String(48), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    telegram_id = Column(BigInteger, nullable=True, index=True)
    product_type = Column(String(32), nullable=False, index=True)
    product_data = Column(JSON, nullable=False)
    quote_snapshot = Column(JSON, nullable=False)
    amount_tiyin = Column(BigInteger, nullable=False)
    currency = Column(String(3), nullable=False, default="UZS")
    payment_provider = Column(String(32), nullable=False, default="payme", index=True)
    environment = Column(String(16), nullable=False, default="production", index=True)
    status = Column(String(32), nullable=False, default="pending", index=True)
    fulfillment_status = Column(String(32), nullable=False, default="not_started", index=True)
    fulfillment_ledger_id = Column(
        Integer,
        ForeignKey("coin_ledger.id", ondelete="RESTRICT"),
        nullable=True,
    )
    fulfillment_error = Column(Text, nullable=True)
    payment_completed_at = Column(DateTime(timezone=True), nullable=True)
    fulfilled_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    payme_transactions = relationship("PaymeTransaction", back_populates="order")


class PaymeTransaction(Base):
    __tablename__ = "payme_transactions"
    __table_args__ = (
        UniqueConstraint("payme_transaction_id", name="uq_payme_transactions_payme_id"),
        CheckConstraint("char_length(payme_transaction_id) = 24", name="ck_payme_transactions_payme_id_len"),
        CheckConstraint("amount_tiyin > 0", name="ck_payme_transactions_amount_positive"),
        CheckConstraint("state IN (1, 2, -1, -2)", name="ck_payme_transactions_state"),
        CheckConstraint("create_time_ms > 0", name="ck_payme_transactions_create_time_positive"),
        CheckConstraint("perform_time_ms >= 0", name="ck_payme_transactions_perform_time_nonnegative"),
        CheckConstraint("cancel_time_ms >= 0", name="ck_payme_transactions_cancel_time_nonnegative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    payme_transaction_id = Column(String(24), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("payment_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    payme_time_ms = Column(BigInteger, nullable=False, index=True)
    amount_tiyin = Column(BigInteger, nullable=False)
    state = Column(Integer, nullable=False, default=1, index=True)
    reason = Column(Integer, nullable=True)
    create_time_ms = Column(BigInteger, nullable=False)
    perform_time_ms = Column(BigInteger, nullable=False, default=0)
    cancel_time_ms = Column(BigInteger, nullable=False, default=0)
    account = Column(JSON, nullable=False)
    raw_create_request = Column(JSON, nullable=True)
    raw_perform_request = Column(JSON, nullable=True)
    raw_cancel_request = Column(JSON, nullable=True)
    raw_check_request = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    order = relationship("PaymentOrder", back_populates="payme_transactions")
