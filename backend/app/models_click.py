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
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class ClickTransaction(Base):
    __tablename__ = "click_transactions"
    __table_args__ = (
        UniqueConstraint("click_trans_id", name="uq_click_transactions_click_trans_id"),
        UniqueConstraint("click_paydoc_id", name="uq_click_transactions_click_paydoc_id"),
        CheckConstraint("amount_tiyin > 0", name="ck_click_transactions_amount_positive"),
        CheckConstraint("action IN (0, 1)", name="ck_click_transactions_action"),
        CheckConstraint(
            "state IN ('prepared', 'completed', 'cancelled', 'failed')",
            name="ck_click_transactions_state",
        ),
        Index("ix_click_transactions_order_state", "order_id", "state"),
    )

    id = Column(Integer, primary_key=True, index=True)
    click_trans_id = Column(BigInteger, nullable=False, index=True)
    service_id = Column(Integer, nullable=False, index=True)
    click_paydoc_id = Column(BigInteger, nullable=False, index=True)
    merchant_trans_id = Column(String(48), nullable=False, index=True)
    merchant_prepare_id = Column(Integer, nullable=True, index=True)
    merchant_confirm_id = Column(Integer, nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("payment_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount = Column(Numeric(18, 2), nullable=False)
    amount_tiyin = Column(BigInteger, nullable=False)
    action = Column(Integer, nullable=False, default=0)
    state = Column(String(32), nullable=False, default="prepared", index=True)
    error = Column(Integer, nullable=False, default=0)
    error_note = Column(String(255), nullable=False, default="Success")
    sign_time = Column(String(32), nullable=False)
    raw_prepare_request = Column(JSON, nullable=True)
    raw_complete_request = Column(JSON, nullable=True)
    failure_reason = Column(Text, nullable=True)
    prepared_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
