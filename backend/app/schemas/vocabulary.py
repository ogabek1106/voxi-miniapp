from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class VocabularyPuzzleWordIn(BaseModel):
    word_text: str = Field(..., min_length=1)
    image_url: Optional[str] = None
    is_correct: bool = False

    @field_validator("word_text")
    @classmethod
    def clean_word(cls, value: str) -> str:
        value = str(value or "").strip()
        if not value:
            raise ValueError("word_text_required")
        return value

    @field_validator("image_url")
    @classmethod
    def clean_image_url(cls, value: Optional[str]) -> Optional[str]:
        value = str(value or "").strip()
        return value or None


class VocabularyPuzzleSetIn(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    category: Optional[str] = None
    explanation: Optional[str] = None
    status: Optional[str] = "draft"
    words: list[VocabularyPuzzleWordIn]

    @model_validator(mode="after")
    def validate_words(self):
        if len(self.words or []) != 4:
            raise ValueError("exactly_4_words_required")
        correct_count = sum(1 for word in self.words if word.is_correct)
        if correct_count != 1:
            raise ValueError("exactly_1_correct_word_required")
        if self.status not in {"draft", "published"}:
            raise ValueError("invalid_status")
        return self


class VocabularyPuzzleCheckIn(BaseModel):
    set_id: int
    selected_word_id: int
