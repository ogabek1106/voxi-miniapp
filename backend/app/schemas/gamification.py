from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


BADGE_CONDITIONS = {
    "streak_days",
    "xp_total",
    "vocabulary_activities_completed",
    "listening_tasks_completed",
    "shadow_writings_completed",
    "leaderboard_rank_top",
    "early_launch_user",
}


class MonthlyRewardClaimIn(BaseModel):
    milestone_day: int = Field(..., ge=1, le=31)


class BadgeIn(BaseModel):
    code: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    type: str = "general"
    icon_url: Optional[str] = None
    unlock_condition_type: str
    unlock_condition_value: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0

    @field_validator("code", "name", "type", "unlock_condition_type")
    @classmethod
    def clean_required(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("required")
        return value

    @field_validator("unlock_condition_type")
    @classmethod
    def validate_condition(cls, value: str) -> str:
        if value not in BADGE_CONDITIONS:
            raise ValueError("invalid_condition")
        return value


class MonthlyRewardRuleIn(BaseModel):
    name: str = Field(..., min_length=1)
    month_length: Optional[int] = None
    milestone_day: int = Field(..., ge=1, le=31)
    reward_type: str = Field(..., min_length=1)
    reward_payload: dict[str, Any] = Field(default_factory=dict)
    chest_type: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

    @field_validator("month_length")
    @classmethod
    def validate_month_length(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if int(value) not in {28, 29, 30, 31}:
            raise ValueError("invalid_month_length")
        return int(value)

