from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class WordMergeStageIn(BaseModel):
    english_word: str = Field(..., min_length=1)
    uzbek_meaning: str = Field(..., min_length=1)

    @field_validator("english_word", "uzbek_meaning")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("required")
        return value


class WordMergeFamilyIn(BaseModel):
    title: str = Field(..., min_length=1)
    cefr_level: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = "inactive"
    mastery_target: int = 128
    stages: list[WordMergeStageIn]

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("title_required")
        return value

    @field_validator("cefr_level", "category", "status")
    @classmethod
    def clean_optional(cls, value: Optional[str]) -> Optional[str]:
        value = str(value or "").strip()
        return value or None

    @model_validator(mode="after")
    def validate_family(self):
        if self.cefr_level and self.cefr_level not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
            raise ValueError("invalid_cefr_level")
        if self.status and self.status not in {"active", "inactive"}:
            raise ValueError("invalid_status")
        if self.mastery_target not in {8, 16, 32, 64, 128, 256, 512, 1024}:
            raise ValueError("invalid_mastery_target")
        if len(self.stages or []) < 2:
            raise ValueError("at_least_2_stages_required")
        return self


class WordMergeSessionIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None


class WordMergeSessionFinishIn(BaseModel):
    user_id: Optional[int] = None
    telegram_id: Optional[int] = None
    score: int = 0
    mastered_count: int = 0
    moves_count: int = 0
    status: str = "finished"
    board_state: Optional[dict] = None
