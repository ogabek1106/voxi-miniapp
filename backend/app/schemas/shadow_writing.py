from typing import Optional

from pydantic import BaseModel, Field


class ShadowWritingEssayIn(BaseModel):
    title: Optional[str] = None
    level: str = Field(..., min_length=1)
    theme: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)


class ShadowWritingAttemptIn(BaseModel):
    telegram_id: int
    essay_id: int
    attempt_id: Optional[int] = None
    time_seconds: Optional[int] = None
    accuracy: Optional[float] = None
    mistakes_count: Optional[int] = None
    typed_chars: Optional[int] = None
