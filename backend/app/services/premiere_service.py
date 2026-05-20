from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.models import MockPack, MockPackStatus, PremiereAccess
from app.models_vcoins import PaymentRequest
from app.services.payment_pricing_service import generate_payment_token


PREMIERE_PAYMENT_KIND = "premiere_access"
PREMIERE_PAYMENT_EXPIRY_HOURS = 24
PREMIERE_THEMES = {"violet_aurora", "sky_blue", "arctic_glow", "sunset_peach"}
DEFAULT_PREMIERE_THEME = "violet_aurora"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_premiere_active(pack: MockPack | None, now: datetime | None = None) -> bool:
    if not pack:
        return False
    if not bool(pack.premiere_is_active):
        return False
    status = pack.status.value if hasattr(pack.status, "value") else str(pack.status)
    if status != MockPackStatus.published.value:
        return False
    ends_at = to_utc(pack.premiere_ends_at)
    return ends_at is None or ends_at > to_utc(now or utcnow())


def normalize_theme(value: str | None) -> str:
    theme = (value or DEFAULT_PREMIERE_THEME).strip().lower().replace("-", "_")
    return theme if theme in PREMIERE_THEMES else DEFAULT_PREMIERE_THEME


def expire_stale_premieres(db: Session) -> int:
    now = utcnow()
    stale = (
        db.query(MockPack)
        .filter(MockPack.premiere_is_active == True)  # noqa: E712
        .filter(MockPack.premiere_ends_at.isnot(None))
        .filter(MockPack.premiere_ends_at <= now)
        .all()
    )
    for pack in stale:
        pack.premiere_is_active = False
        pack.premiere_updated_at = now
        db.add(pack)
    if stale:
        db.commit()
    return len(stale)


def serialize_premiere_pack(
    pack: MockPack | None,
    telegram_id: int | None = None,
    db: Session | None = None,
    user_id: int | None = None,
    email: str | None = None,
) -> dict | None:
    if not pack:
        return None
    has_access = False
    if db is not None:
        has_access = has_active_premiere_access_for_identity(
            db,
            mock_pack_id=pack.id,
            telegram_id=telegram_id,
            user_id=user_id,
            email=email,
        )
    return {
        "id": pack.id,
        "title": pack.title,
        "status": pack.status.value if hasattr(pack.status, "value") else str(pack.status),
        "premiere_is_active": bool(pack.premiere_is_active),
        "premiere_is_live": is_premiere_active(pack),
        "premiere_ends_at": pack.premiere_ends_at.isoformat() if pack.premiere_ends_at else None,
        "premiere_price_uzs": int(pack.premiere_price_uzs or 0),
        "premiere_label": pack.premiere_label or "PREMIERE",
        "premiere_description": pack.premiere_description or "",
        "premiere_theme": normalize_theme(pack.premiere_theme),
        "has_access": has_access,
        "server_now": utcnow().isoformat(),
    }


def get_active_premiere(db: Session) -> MockPack | None:
    expire_stale_premieres(db)
    now = utcnow()
    packs = (
        db.query(MockPack)
        .filter(MockPack.status == MockPackStatus.published)
        .filter(MockPack.premiere_is_active == True)  # noqa: E712
        .order_by(MockPack.premiere_updated_at.desc().nullslast(), MockPack.id.desc())
        .all()
    )
    for pack in packs:
        if is_premiere_active(pack, now):
            return pack
    return None


def get_pack(db: Session, pack_id: int) -> MockPack:
    expire_stale_premieres(db)
    pack = db.query(MockPack).filter(MockPack.id == int(pack_id)).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Mock Pack not found")
    return pack


def enable_premiere(
    db: Session,
    *,
    pack_id: int,
    ends_at: datetime | None,
    price_uzs: int,
    label: str | None = None,
    description: str | None = None,
    theme: str | None = None,
) -> MockPack:
    pack = get_pack(db, pack_id)
    if pack.status != MockPackStatus.published:
        raise HTTPException(status_code=422, detail="Mock Pack must be published before becoming Premiere.")

    other = get_active_premiere(db)
    if other and int(other.id) != int(pack.id):
        raise HTTPException(
            status_code=409,
            detail="Another Mock Pack is already in Premiere mode. Disable it first before enabling a new one.",
        )

    price = int(price_uzs or 0)
    if price <= 0:
        raise HTTPException(status_code=422, detail="Premiere price must be positive.")

    end_value = to_utc(ends_at)
    if not end_value:
        raise HTTPException(status_code=422, detail="Premiere end time is required.")
    if end_value <= utcnow():
        raise HTTPException(status_code=422, detail="Premiere end time must be in the future.")

    pack.premiere_is_active = True
    pack.premiere_ends_at = end_value
    pack.premiere_price_uzs = price
    pack.premiere_label = (label or "PREMIERE").strip()[:120]
    pack.premiere_description = (description or "").strip() or None
    pack.premiere_theme = normalize_theme(theme)
    pack.premiere_updated_at = utcnow()
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


def disable_premiere(db: Session, pack_id: int) -> MockPack:
    pack = get_pack(db, pack_id)
    pack.premiere_is_active = False
    pack.premiere_updated_at = utcnow()
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


def has_active_premiere_access(db: Session, telegram_id: int | None, mock_pack_id: int) -> bool:
    return has_active_premiere_access_for_identity(db, mock_pack_id=mock_pack_id, telegram_id=telegram_id)


def has_active_premiere_access_for_identity(
    db: Session,
    *,
    mock_pack_id: int,
    telegram_id: int | None = None,
    user_id: int | None = None,
    email: str | None = None,
) -> bool:
    if not telegram_id:
        telegram_id = None
    normalized_email = normalize_email(email)
    if not telegram_id and not user_id and not normalized_email:
        return False
    pack = db.query(MockPack).filter(MockPack.id == int(mock_pack_id)).first()
    if not is_premiere_active(pack):
        return False
    query = (
        db.query(PremiereAccess)
        .filter(PremiereAccess.mock_pack_id == int(mock_pack_id))
        .filter(PremiereAccess.status == "active")
    )
    filters = []
    if telegram_id:
        filters.append(PremiereAccess.telegram_id == int(telegram_id))
    if user_id:
        filters.append(PremiereAccess.user_id == int(user_id))
    if normalized_email:
        filters.append(PremiereAccess.email == normalized_email)
    if not filters:
        return False
    from sqlalchemy import or_
    access = query.filter(or_(*filters)).order_by(PremiereAccess.id.desc()).first()
    if not access:
        return False
    expires_at = to_utc(access.expires_at)
    return expires_at is None or expires_at > utcnow()


def is_active_premiere_pack(db: Session, mock_pack_id: int) -> bool:
    pack = db.query(MockPack).filter(MockPack.id == int(mock_pack_id)).first()
    return is_premiere_active(pack)


def is_premiere_payment(payment: PaymentRequest | None) -> bool:
    payload: dict[str, Any] = dict(payment.raw_payload or {}) if payment else {}
    return payload.get("payment_kind") == PREMIERE_PAYMENT_KIND or payload.get("source") == "premiere_access_intent"


def normalize_email(value: str | None) -> str | None:
    cleaned = str(value or "").strip().lower()
    return cleaned or None


def create_premiere_payment_intent(
    db: Session,
    *,
    telegram_id: int | None,
    pack_id: int,
    user_id: int | None = None,
    email: str | None = None,
) -> PaymentRequest:
    pack = get_pack(db, pack_id)
    if not is_premiere_active(pack):
        raise HTTPException(status_code=404, detail="premiere_not_active")

    normalized_email = normalize_email(email)
    clean_telegram_id = int(telegram_id) if telegram_id else None
    clean_user_id = int(user_id) if user_id else None
    if not clean_telegram_id and not clean_user_id and not normalized_email:
        raise HTTPException(status_code=401, detail="premiere_login_required")

    is_admin = bool(clean_telegram_id and clean_telegram_id in ADMIN_IDS)
    if not is_admin and has_active_premiere_access_for_identity(
        db,
        mock_pack_id=pack_id,
        telegram_id=clean_telegram_id,
        user_id=clean_user_id,
        email=normalized_email,
    ):
        raise HTTPException(status_code=409, detail="premiere_already_unlocked")

    price = int(pack.premiere_price_uzs or 0)
    if price <= 0:
        raise HTTPException(status_code=422, detail="premiere_price_not_configured")

    now = utcnow()
    payment = PaymentRequest(
        telegram_id=clean_telegram_id,
        user_id=clean_user_id,
        email=normalized_email,
        package_code="premiere_access",
        expected_price=str(price),
        coins_to_add=0,
        payment_token=generate_payment_token(db),
        subtotal_amount=price,
        discount_amount=0,
        final_amount=price,
        expires_at=now + timedelta(hours=PREMIERE_PAYMENT_EXPIRY_HOURS),
        status="pending",
        raw_payload={
            "source": "premiere_access_intent",
            "payment_kind": PREMIERE_PAYMENT_KIND,
            "mock_pack_id": int(pack.id),
            "mock_title": pack.title,
            "premiere_ends_at": pack.premiere_ends_at.isoformat() if pack.premiere_ends_at else None,
            "created_at": now.isoformat(),
            "identity": {
                "telegram_id": clean_telegram_id,
                "user_id": clean_user_id,
                "email": normalized_email,
            },
            "email_verification_required": bool(normalized_email and not clean_telegram_id),
        },
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def _payment_expired(payment: PaymentRequest) -> bool:
    expires_at = to_utc(payment.expires_at)
    return bool(expires_at and expires_at <= utcnow())


def get_premiere_payment_request(
    db: Session,
    *,
    payment_token: str,
    telegram_id: int | None = None,
    user_id: int | None = None,
    email: str | None = None,
) -> PaymentRequest:
    token = str(payment_token or "").strip().upper()
    if not token:
        raise HTTPException(status_code=422, detail="payment_token_required")
    payment = db.query(PaymentRequest).filter(PaymentRequest.payment_token == token).first()
    if not payment or not is_premiere_payment(payment):
        raise HTTPException(status_code=404, detail="premiere_payment_not_found")

    normalized_email = normalize_email(email)
    identity_matches = False
    if telegram_id and payment.telegram_id and int(payment.telegram_id) == int(telegram_id):
        identity_matches = True
    if user_id and payment.user_id and int(payment.user_id) == int(user_id):
        identity_matches = True
    if normalized_email and normalize_email(payment.email) == normalized_email:
        identity_matches = True
    if not identity_matches:
        raise HTTPException(status_code=403, detail="premiere_payment_identity_mismatch")

    if payment.status == "pending" and _payment_expired(payment):
        payment.status = "expired"
        db.add(payment)
        db.commit()
        db.refresh(payment)
    return payment


def grant_premiere_access_from_payment(db: Session, payment: PaymentRequest) -> PremiereAccess:
    payload = dict(payment.raw_payload or {})
    pack_id = int(payload.get("mock_pack_id") or 0)
    if not pack_id:
        raise HTTPException(status_code=422, detail="premiere_payment_missing_mock_pack")
    if not payment.telegram_id and not payment.user_id and not payment.email:
        raise HTTPException(status_code=422, detail="premiere_payment_missing_identity")
    pack = get_pack(db, pack_id)
    query = (
        db.query(PremiereAccess)
        .filter(PremiereAccess.mock_pack_id == int(pack_id))
        .filter(PremiereAccess.status == "active")
    )
    from sqlalchemy import or_
    filters = []
    if payment.telegram_id:
        filters.append(PremiereAccess.telegram_id == int(payment.telegram_id))
    if payment.user_id:
        filters.append(PremiereAccess.user_id == int(payment.user_id))
    if payment.email:
        filters.append(PremiereAccess.email == normalize_email(payment.email))
    access = query.filter(or_(*filters)).first()
    if not access:
        access = PremiereAccess(
            telegram_id=int(payment.telegram_id) if payment.telegram_id else None,
            user_id=int(payment.user_id) if payment.user_id else None,
            email=normalize_email(payment.email),
            mock_pack_id=int(pack_id),
            created_at=utcnow(),
            status="active",
        )
    elif payment.telegram_id and not access.telegram_id:
        access.telegram_id = int(payment.telegram_id)
    access.payment_request_id = payment.id
    access.expires_at = to_utc(pack.premiere_ends_at)
    db.add(access)
    return access
