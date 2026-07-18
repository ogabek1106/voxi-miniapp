from typing import Optional

from pydantic import BaseModel


class VCoinClickCheckoutRequest(BaseModel):
    telegram_id: Optional[int] = None
    coins: int
    promo_code: Optional[str] = None


class DonationClickCheckoutRequest(BaseModel):
    telegram_id: Optional[int] = None
    amount_uzs: int


class ClickTestSimulateRequest(BaseModel):
    telegram_id: int
    action: str
    order_ref: str
    amount_tiyin: int
    click_trans_id: int
    click_paydoc_id: int
