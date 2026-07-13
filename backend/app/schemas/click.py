from typing import Optional

from pydantic import BaseModel


class VCoinClickCheckoutRequest(BaseModel):
    telegram_id: int
    coins: int
    promo_code: Optional[str] = None


class ClickTestSimulateRequest(BaseModel):
    telegram_id: int
    action: str
    order_ref: str
    amount_tiyin: int
    click_trans_id: int
    click_paydoc_id: int
