from typing import Any, Optional

from pydantic import BaseModel, Field


class PaymeJsonRpcRequest(BaseModel):
    id: Any = None
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


class VCoinPaymeCheckoutRequest(BaseModel):
    telegram_id: int
    coins: int
    promo_code: Optional[str] = None


class PaymeTestSimulateRequest(BaseModel):
    telegram_id: int
    action: str
    order_ref: str
    amount_tiyin: int
    transaction_id: str
    payme_time_ms: int
    reason: Optional[int] = 1
