from typing import Optional

from pydantic import BaseModel


class VCoinClickCheckoutRequest(BaseModel):
    telegram_id: int
    coins: int
    promo_code: Optional[str] = None
