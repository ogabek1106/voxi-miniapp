#backend/app/api/mock_tests.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])


class MockTestItem(BaseModel):
    id: int
    title: str


class MockInfo(BaseModel):
    title: str
    attention: str
    duration_hours: int
    buttons: List[str]


class Question(BaseModel):
    id: int
    text: str
    options: List[str]
    correct: int


class ReadingTest(BaseModel):
    passage: str
    questions: List[Question]


@router.get("", response_model=List[MockTestItem])
async def list_mock_tests():
    return [
        {"id": 1, "title": "Mock 1"},
    ]


@router.get("/{mock_id}/info", response_model=MockInfo)
async def get_mock_info(mock_id: int):
    if mock_id != 1:
        return {"title": "Not found", "attention": "", "duration_hours": 0, "buttons": []}

    return {
        "title": "Mock 1",
        "attention": (
            "Before you start:\n"
            "- Prepare pen and paper\n"
            "- You need 3–4 hours\n"
            "- Do not refresh the page\n"
            "- Be honest with yourself"
        ),
        "duration_hours": 4,
        "buttons": ["Start", "Cancel"]
    }


@router.get("/{mock_id}/start", response_model=ReadingTest)
async def start_mock_test(mock_id: int):
    if mock_id != 1:
        return {"passage": "", "questions": []}

    return {
        "passage": (
            "Anna moved to another country to improve her English. "
            "At first, she felt shy speaking with locals, but over time, "
            "she became more confident and made many friends."
        ),
        "questions": [
            {
                "id": 1,
                "text": "Why did Anna move to another country?",
                "options": [
                    "To find a job",
                    "To improve her English",
                    "To visit friends",
                    "To study history"
                ],
                "correct": 1
            },
            {
                "id": 2,
                "text": "How did Anna feel at first?",
                "options": [
                    "Confident",
                    "Angry",
                    "Shy",
                    "Excited"
                ],
                "correct": 2
            }
        ]
    }
