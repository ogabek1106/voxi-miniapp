from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, JSON, String, Text

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class PaymentRequest(Base):
    __tablename__ = "payment_requests"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, nullable=False, index=True)
    package_code = Column(String, nullable=True)
    expected_price = Column(String, nullable=True)
    coins_to_add = Column(Integer, nullable=False)
    receipt_file_id = Column(Text, nullable=True)
    receipt_image_hash = Column(String, nullable=True, index=True)
    payment_token = Column(String, nullable=True, index=True, unique=True)
    exchange_rate_uzs = Column(Integer, nullable=True)
    subtotal_amount = Column(Integer, nullable=True)
    promo_code = Column(String, nullable=True, index=True)
    discount_percent = Column(Integer, nullable=True)
    discount_amount = Column(Integer, nullable=True)
    final_amount = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="pending", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    admin_id = Column(BigInteger, nullable=True)
    reject_reason = Column(Text, nullable=True)
    raw_payload = Column(JSON, nullable=True)


class VCoinPaymentSettings(Base):
    __tablename__ = "vcoin_payment_settings"

    id = Column(Integer, primary_key=True, index=True)
    exchange_rate_uzs = Column(Integer, nullable=False, default=5000)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class VCoinPromoCode(Base):
    __tablename__ = "vcoin_promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True, index=True)
    discount_percent = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    usage_limit = Column(Integer, nullable=True)
    successful_uses = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class CoinLedger(Base):
    __tablename__ = "coin_ledger"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    reason = Column(String, nullable=False, index=True)
    reference_type = Column(String, nullable=True)
    reference_id = Column(String, nullable=True, index=True)
    balance_after = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
