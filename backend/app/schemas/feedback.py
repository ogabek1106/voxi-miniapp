from typing import Optional

from pydantic import BaseModel, Field


class FeedbackSubmitIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None
    feature_type: str = Field(..., min_length=1, max_length=80)
    context_key: str = Field(..., min_length=1, max_length=180)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)
    public_permission: bool = False
    status: str = Field(default="submitted", max_length=20)
