from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ActivityHeartbeatIn(BaseModel):
    session_key: str = Field(..., min_length=8, max_length=96)
    visitor_key: Optional[str] = Field(default=None, max_length=96)
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None
    user_name: Optional[str] = Field(default=None, max_length=160)
    current_page: str = Field(default="unknown", max_length=80)
    device_type: str = Field(default="unknown", max_length=60)

    @field_validator("session_key", "visitor_key", "user_name", "current_page", "device_type")
    @classmethod
    def clean_string(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
