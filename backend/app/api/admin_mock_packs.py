# backend/app/api/admin_mock_packs.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.deps import get_db
from app.models import MockPack
from app.models import ReadingTest
from app.models import WritingTest, WritingTask
from app.models import SpeakingTest, SpeakingPart
from fastapi import HTTPException
from app.models import MockPackStatus

router = APIRouter(prefix="/admin/mock-packs", tags=["admin-mock-packs"])


class MockPackCreate(BaseModel):
    title: str


@router.get("")
def list_mock_packs(db: Session = Depends(get_db)):
    packs = db.query(MockPack).order_by(MockPack.id.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
        }
        for p in packs
    ]


@router.post("")
def create_mock_pack(payload: MockPackCreate, db: Session = Depends(get_db)):
    pack = MockPack(title=payload.title)
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


@router.get("/{pack_id}/reading")
def get_mock_pack_reading(pack_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(ReadingTest)
        .filter(ReadingTest.mock_pack_id == pack_id)
        .first()
    )

    if not test:
        raise HTTPException(status_code=404, detail="Reading not found")

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "passages": [
            {
                "id": p.id,
                "order_index": p.order_index,
                "title": p.title,
                "text": p.text,
                "image_url": p.image_url,
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "type": q.type.value if hasattr(q.type, "value") else str(q.type),
                        "instruction": q.instruction,
                        "content": q.content,
                        "correct_answer": q.correct_answer,
                        "image_url": q.image_url,
                        "meta": q.meta,
                        "explanation": q.explanation,
                        "points": q.points,
                    }
                    for q in sorted(p.questions, key=lambda x: x.order_index)
                ]
            }
            for p in sorted(test.passages, key=lambda x: x.order_index)
        ]
    }


@router.get("/{pack_id}/writing")
def get_mock_pack_writing(pack_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(WritingTest)
        .filter(WritingTest.mock_pack_id == pack_id)
        .first()
    )

    if not test:
        return None

    tasks = (
        db.query(WritingTask)
        .filter(WritingTask.test_id == test.id)
        .order_by(WritingTask.order_index.asc(), WritingTask.task_number.asc())
        .all()
    )

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "tasks": [
            {
                "id": task.id,
                "task_number": task.task_number,
                "instruction_template": task.instruction_template,
                "question_text": task.question_text,
                "image_url": task.image_url,
                "order_index": task.order_index
            }
            for task in tasks
        ]
    }


@router.get("/{pack_id}/speaking")
def get_mock_pack_speaking(pack_id: int, db: Session = Depends(get_db)):
    test = (
        db.query(SpeakingTest)
        .filter(SpeakingTest.mock_pack_id == pack_id)
        .first()
    )

    if not test:
        return None

    parts = (
        db.query(SpeakingPart)
        .filter(SpeakingPart.test_id == test.id)
        .order_by(SpeakingPart.order_index.asc(), SpeakingPart.part_number.asc())
        .all()
    )

    return {
        "id": test.id,
        "title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "status": test.status.value if hasattr(test.status, "value") else str(test.status),
        "parts": [
            {
                "id": part.id,
                "part_number": part.part_number,
                "instruction": part.instruction,
                "question": part.question,
                "order_index": part.order_index
            }
            for part in parts
        ]
    }

@router.delete("/{pack_id}")
def delete_mock_pack(pack_id: int, db: Session = Depends(get_db)):
    pack = db.query(MockPack).filter(MockPack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Mock pack not found")

    db.delete(pack)
    db.commit()

    return {"status": "deleted", "id": pack_id}
    
@router.post("/{pack_id}/toggle")
def toggle_mock_pack(pack_id: int, db: Session = Depends(get_db)):
    pack = db.query(MockPack).filter(MockPack.id == pack_id).first()

    if not pack:
        raise HTTPException(status_code=404, detail="Mock pack not found")

    if pack.status == MockPackStatus.published:
        pack.status = MockPackStatus.draft
    else:
        pack.status = MockPackStatus.published

    db.commit()
    db.refresh(pack)

    return {
        "id": pack.id,
        "status": pack.status.value
    }
