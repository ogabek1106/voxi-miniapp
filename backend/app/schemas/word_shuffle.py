from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class WordShuffleEntryIn(BaseModel):
    word: str = Field(..., min_length=2)
    translation: str = Field(..., min_length=1)
    example_sentence: Optional[str] = None
    cefr_level: Optional[str] = None
    category: Optional[str] = None
    difficulty: str = "easy"
    status: str = "inactive"

    @field_validator("word", "translation")
    @classmethod
    def clean_required(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("required")
        return value

    @field_validator("example_sentence", "cefr_level", "category", "difficulty", "status")
    @classmethod
    def clean_optional(cls, value: Optional[str]) -> Optional[str]:
        value = str(value or "").strip()
        return value or None

    @model_validator(mode="after")
    def validate_entry(self):
        if self.cefr_level and self.cefr_level not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
            raise ValueError("invalid_cefr_level")
        if self.difficulty not in {"easy", "medium", "hard"}:
            raise ValueError("invalid_difficulty")
        if self.status not in {"active", "inactive"}:
            raise ValueError("invalid_status")
        return self


class WordShuffleSessionIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None


class WordShuffleSessionFinishIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None
    score: int = 0
    solved_count: int = 0
    best_streak: int = 0
    status: str = "finished"
