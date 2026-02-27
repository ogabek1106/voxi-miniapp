# backend/app/api/admin_mock_packs.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.deps import get_db
from app.models import MockPack
from app.models import ReadingTest
from fastapi import HTTPException


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
        "status": test.status.value,
        "passages": [
            {
                "id": p.id,
                "order_index": p.order_index,
                "title": p.title,
                "text": p.text,
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "type": q.type,
                        "text": q.text,
                        "correct_answer": q.correct_answer,
                        "options": q.options,
                        "word_limit": q.word_limit,
                    }
                    for q in sorted(p.questions, key=lambda x: x.order_index)
                ]
            }
            for p in sorted(test.passages, key=lambda x: x.order_index)
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
