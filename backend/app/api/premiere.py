import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.payment_pricing_service import serialize_payment_request
from app.services.premiere_service import (
    create_premiere_payment_intent,
    get_active_premiere,
    has_active_premiere_access,
    serialize_premiere_pack,
)

router = APIRouter(prefix="/premiere", tags=["premiere"])


class PremierePaymentIn(BaseModel):
    telegram_id: int


def _bot_payment_link(token: str) -> str:
    username = os.getenv("VOXI_BOT_USERNAME", "voxi_aibot").strip().lstrip("@") or "voxi_aibot"
    return f"https://t.me/{username}?start=pay_{token}"


@router.get("/active")
def get_active(telegram_id: int | None = None, db: Session = Depends(get_db)):
    pack = get_active_premiere(db)
    return {
        "active": bool(pack),
        "premiere": serialize_premiere_pack(pack, telegram_id=telegram_id, db=db) if pack else None,
    }


@router.get("/{pack_id}/access")
def get_access(pack_id: int, telegram_id: int, db: Session = Depends(get_db)):
    return {
        "has_access": has_active_premiere_access(db, telegram_id, pack_id),
    }


@router.post("/{pack_id}/payment-intents")
def create_payment_intent(pack_id: int, payload: PremierePaymentIn, db: Session = Depends(get_db)):
    payment = create_premiere_payment_intent(db, telegram_id=payload.telegram_id, pack_id=pack_id)
    data = serialize_payment_request(payment)
    data["bot_link"] = _bot_payment_link(payment.payment_token)
    return data
