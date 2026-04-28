import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.payment_service import (
    confirm_payment,
    create_payment_request,
    reject_payment,
)
from app.services.vcoin_service import get_balance
from app.services.vcoin_service import get_recent_ledger, spend_once_for_content


router = APIRouter(prefix="/vcoins", tags=["vcoins"])


class PaymentRequestIn(BaseModel):
    telegram_id: int
    package_code: Optional[str] = None
    coins: int
    price: Optional[str] = None
    receipt_file_id: Optional[str] = None
    receipt_image_hash: Optional[str] = None
    submitted_at: Optional[str] = None

    class Config:
        extra = "allow"


class PaymentActionIn(BaseModel):
    admin_id: Optional[int] = None
    admin_telegram_id: Optional[int] = None
    reject_reason: Optional[str] = None
    reason: Optional[str] = None


class VCoinSpendIn(BaseModel):
    telegram_id: int
    content_type: str
    reference_id: str


def _bot_buy_link() -> Optional[str]:
    explicit = os.getenv("VOXI_BOT_BUY_LINK", "").strip()
    if explicit:
        return explicit

    username = os.getenv("VOXI_BOT_USERNAME", "").strip().lstrip("@")
    if not username:
        return None
    return f"https://t.me/{username}?start=buy_vcoin"


def require_backend_token(authorization: str = Header(default="")):
    expected = os.getenv("VCOIN_BACKEND_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="vcoin_backend_token_not_configured")

    prefix = "Bearer "
    if not authorization.startswith(prefix) or authorization[len(prefix):] != expected:
        raise HTTPException(status_code=401, detail="invalid_vcoin_backend_token")


@router.post("/payment-requests")
def create_vcoin_payment_request(
    payload: PaymentRequestIn,
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    data: Dict[str, Any] = payload.model_dump()
    payment = create_payment_request(db, data)
    duplicate = payment.status == "duplicate_suspected"
    return {
        "ok": True,
        "payment_id": payment.id,
        "status": payment.status,
        "duplicate_suspected": duplicate,
        "telegram_id": payment.telegram_id,
    }


@router.post("/payment-requests/{payment_id}/confirm")
def confirm_vcoin_payment(
    payment_id: int,
    payload: PaymentActionIn = Body(default_factory=PaymentActionIn),
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    admin_id = payload.admin_id if payload.admin_id is not None else payload.admin_telegram_id
    return confirm_payment(db, payment_id, admin_id=admin_id)


@router.post("/payment-requests/{payment_id}/reject")
def reject_vcoin_payment(
    payment_id: int,
    payload: PaymentActionIn = Body(default_factory=PaymentActionIn),
    db: Session = Depends(get_db),
    _: None = Depends(require_backend_token),
):
    admin_id = payload.admin_id if payload.admin_id is not None else payload.admin_telegram_id
    reason = payload.reject_reason or payload.reason
    return reject_payment(db, payment_id, admin_id=admin_id, reason=reason)


@router.get("/balance")
def get_vcoin_balance(telegram_id: int = Query(...), db: Session = Depends(get_db)):
    return {
        "telegram_id": int(telegram_id),
        "v_coins": get_balance(db, telegram_id),
    }


@router.get("/buy-link")
def get_vcoin_buy_link():
    link = _bot_buy_link()
    return {
        "ok": bool(link),
        "url": link,
        "start_payload": "buy_vcoin",
    }


@router.get("/ledger")
def get_vcoin_ledger(
    telegram_id: int = Query(...),
    limit: int = Query(4),
    db: Session = Depends(get_db),
):
    entries = get_recent_ledger(db, telegram_id, limit=limit)
    return {
        "telegram_id": int(telegram_id),
        "items": [
            {
                "id": item.id,
                "delta": item.delta,
                "reason": item.reason,
                "reference_type": item.reference_type,
                "reference_id": item.reference_id,
                "balance_after": item.balance_after,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in entries
        ],
    }


@router.post("/spend")
def spend_vcoins(payload: VCoinSpendIn, db: Session = Depends(get_db)):
    result = spend_once_for_content(
        db=db,
        telegram_id=payload.telegram_id,
        content_type=payload.content_type,
        reference_id=payload.reference_id,
    )
    db.commit()
    return {
        "ok": True,
        "telegram_id": result.telegram_id,
        "content_type": payload.content_type,
        "reference_id": str(payload.reference_id),
        "required": result.required,
        "balance": result.balance,
        "already_spent": result.reason == "already_spent",
    }


@router.get("/balance/{telegram_id}")
def get_vcoin_balance_by_path(telegram_id: int, db: Session = Depends(get_db)):
    return {
        "telegram_id": int(telegram_id),
        "v_coins": get_balance(db, telegram_id),
        "balance": get_balance(db, telegram_id),
    }
