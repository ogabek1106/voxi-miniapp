# backend/app/api/mock_list.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import MockPack, MockPackStatus, SpeakingTest, WritingTest

router = APIRouter(prefix="/mock", tags=["mock"])


@router.get("/list")
def get_mock_list(db: Session = Depends(get_db)):

    packs = (
        db.query(MockPack)
        .filter(MockPack.status == MockPackStatus.published)
        .order_by(MockPack.id.desc())
        .all()
    )

    return [
        {
            "id": p.id,
            "title": p.title
        }
        for p in packs
    ]


@router.get("/writing-list")
def get_writing_mock_list(db: Session = Depends(get_db)):
    packs = (
        db.query(MockPack)
        .join(WritingTest, WritingTest.mock_pack_id == MockPack.id)
        .filter(
            MockPack.status == MockPackStatus.published
        )
        .order_by(MockPack.id.desc())
        .all()
    )

    unique = {}
    for p in packs:
        if p.id not in unique:
            unique[p.id] = {"id": p.id, "title": p.title}
    return list(unique.values())


@router.get("/speaking-list")
def get_speaking_mock_list(db: Session = Depends(get_db)):
    packs = (
        db.query(MockPack)
        .join(SpeakingTest, SpeakingTest.mock_pack_id == MockPack.id)
        .filter(MockPack.status == MockPackStatus.published)
        .order_by(MockPack.id.desc())
        .all()
    )

    unique = {}
    for p in packs:
        if p.id not in unique:
            unique[p.id] = {"id": p.id, "title": p.title}
    return list(unique.values())
