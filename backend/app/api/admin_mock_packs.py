# backend/app/api/admin_mock_packs.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.deps import get_db
from app.models import MockPack

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
