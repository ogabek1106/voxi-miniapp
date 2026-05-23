from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


class MatchWordIn(BaseModel):
    english_text: str = Field(..., min_length=1)
    translation_text: str = Field(..., min_length=1)
    level: str = "B1"
    theme: Optional[str] = None
    is_active: bool = False

    @field_validator("english_text", "translation_text")
    @classmethod
    def clean_required(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("required")
        return value

    @field_validator("level", "theme")
    @classmethod
    def clean_optional(cls, value: Optional[str]) -> Optional[str]:
        value = str(value or "").strip()
        return value or None

    @model_validator(mode="after")
    def validate_entry(self):
        self.level = (self.level or "B1").upper()
        if self.level not in LEVELS:
            raise ValueError("invalid_level")
        return self


class MatchWordsSessionIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None


class MatchWordsSessionFinishIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None
    correct_count: int = 0
    wrong_count: int = 0
    best_combo: int = 0
    survived_seconds: int = 0
    average_match_seconds: Optional[float] = None
    level_counts: dict[str, int] = Field(default_factory=dict)
    status: str = "finished"
