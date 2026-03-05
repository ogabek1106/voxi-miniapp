# backend/app/api/mock_list.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import MockPack, MockPackStatus

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
