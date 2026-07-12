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
