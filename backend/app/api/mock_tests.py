#backend/app/api/mock_tests.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from typing import Dict
from sqlalchemy.orm import Session
from fastapi import Depends
from app.deps import get_db
from app.models import ReadingTest, ReadingPassage, ReadingQuestion, ReadingTestStatus


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

class OldReadingTestResponse(BaseModel):
    passage: str
    questions: List[Question]

class SubmitAnswersIn(BaseModel):
    answers: Dict[int, int]


class SubmitResultItem(BaseModel):
    question_id: int
    correct: bool


class SubmitResultOut(BaseModel):
    score: int
    total: int
    details: List[SubmitResultItem]


@router.get("", response_model=List[MockTestItem])
async def list_mock_tests():
    return [
        {"id": 1, "title": "Mock 1"},
    ]


@router.get("/{mock_id}/info", response_model=MockInfo)
async def get_mock_info(mock_id: int):
    if mock_id != 1:
        raise HTTPException(status_code=404, detail="Mock test not found")

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


@router.get("/{mock_id}/start", response_model=OldReadingTestResponse)
async def start_mock_test(mock_id: int):
    if mock_id != 1:
        raise HTTPException(status_code=404, detail="Mock test not found")

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


@router.post("/{mock_id}/submit", response_model=SubmitResultOut)
async def submit_mock_test(mock_id: int, payload: SubmitAnswersIn):
    if mock_id != 1:
        raise HTTPException(status_code=404, detail="Mock test not found")

    # Hardcoded correct answers for Mock 1 (v0)
    correct_answers = {
        1: 1,  # question_id: correct_option_index
        2: 2,
    }

    score = 0
    details = []

    for q_id, user_answer in payload.answers.items():
        correct_option = correct_answers.get(q_id)
        is_correct = user_answer == correct_option

        if is_correct:
            score += 1

        details.append({
            "question_id": q_id,
            "correct": is_correct
        })

    return {
        "score": score,
        "total": len(correct_answers),
        "details": details
    }


@router.get("/{mock_id}/reading/start")
def start_reading_test(mock_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.id == mock_id, ReadingTest.status == ReadingTestStatus.published)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Reading test not found or not published")

    passages = (
        db.query(ReadingPassage)
        .filter(ReadingPassage.test_id == test.id)
        .order_by(ReadingPassage.order_index.asc())
        .all()
    )

    result = []
    for p in passages:
        questions = (
            db.query(ReadingQuestion)
            .filter(ReadingQuestion.passage_id == p.id)
            .order_by(ReadingQuestion.order_index.asc())
            .all()
        )

        result.append({
            "id": p.id,
            "title": p.title,
            "text": p.text,
            "questions": [
                {
                    "id": q.id,
                    "type": q.type,
                    "text": q.text,
                    "options": q.options,
                    "word_limit": q.word_limit
                }
                for q in questions
            ]
        })

    return {
        "test_id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "passages": result
    }

