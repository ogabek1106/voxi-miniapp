import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.payment_pricing_service import serialize_payment_request
from app.services.premiere_service import (
    create_premiere_payment_intent,
    get_active_premiere,
    get_pack,
    get_premiere_payment_request,
    has_active_premiere_access,
    serialize_premiere_pack,
)

router = APIRouter(prefix="/premiere", tags=["premiere"])


class PremierePaymentIn(BaseModel):
    telegram_id: int | None = None
    user_id: int | None = None
    email: str | None = None


def _bot_payment_link(token: str) -> str:
    username = os.getenv("VOXI_BOT_USERNAME", "voxi_aibot").strip().lstrip("@") or "voxi_aibot"
    return f"https://t.me/{username}?start=pay_{token}"


@router.get("/active")
def get_active(
    telegram_id: int | None = None,
    user_id: int | None = None,
    email: str | None = None,
    db: Session = Depends(get_db),
):
    pack = get_active_premiere(db)
    return {
        "active": bool(pack),
        "premiere": serialize_premiere_pack(
            pack,
            telegram_id=telegram_id,
            user_id=user_id,
            email=email,
            db=db,
        ) if pack else None,
    }


@router.get("/{pack_id}/access")
def get_access(pack_id: int, telegram_id: int, db: Session = Depends(get_db)):
    return {
        "has_access": has_active_premiere_access(db, telegram_id, pack_id),
    }


@router.post("/{pack_id}/payment-intents")
def create_payment_intent(pack_id: int, payload: PremierePaymentIn, db: Session = Depends(get_db)):
    payment = create_premiere_payment_intent(
        db,
        telegram_id=payload.telegram_id,
        user_id=payload.user_id,
        email=payload.email,
        pack_id=pack_id,
    )
    data = serialize_payment_request(payment)
    data["bot_link"] = _bot_payment_link(payment.payment_token)
    return data


@router.get("/payment-intents/{payment_token}")
def get_premiere_payment_intent(
    payment_token: str,
    telegram_id: int | None = None,
    user_id: int | None = None,
    email: str | None = None,
    db: Session = Depends(get_db),
):
    payment = get_premiere_payment_request(
        db,
        payment_token=payment_token,
        telegram_id=telegram_id,
        user_id=user_id,
        email=email,
    )
    data = serialize_payment_request(payment)
    data["bot_link"] = _bot_payment_link(payment.payment_token)
    pack = None
    if data.get("mock_pack_id"):
        target_pack = get_pack(db, int(data["mock_pack_id"]))
        pack = serialize_premiere_pack(
            target_pack,
            telegram_id=telegram_id,
            user_id=user_id,
            email=email,
            db=db,
        )
    return {"ok": True, "payment": data, "premiere": pack}
