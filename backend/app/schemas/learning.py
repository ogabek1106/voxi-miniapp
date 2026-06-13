from typing import Any

from pydantic import BaseModel, Field


class LearningMonthIn(BaseModel):
    month_number: int | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = "draft"


class LearningDayIn(BaseModel):
    day_number: int | None = None
    title: str | None = None
    subtitle: str | None = None
    status: str | None = "draft"
    estimated_minutes: int | None = None
    xp_reward: int | None = None


class LearningBlockIn(BaseModel):
    block_type: str | None = None
    sort_order: int | None = None
    content_json: dict[str, Any] | None = Field(default_factory=dict)
    is_required: bool = False


class LearningBlockReorderIn(BaseModel):
    block_ids: list[int] = Field(default_factory=list)
