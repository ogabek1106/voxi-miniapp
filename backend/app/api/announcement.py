from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import AppAnnouncement

router = APIRouter(tags=["announcement"])


@router.get("/announcement")
def get_announcement(db: Session = Depends(get_db)):
    row = db.query(AppAnnouncement).filter(AppAnnouncement.id == 1).first()
    if not row:
        return {"text": None, "image_url": None, "has_content": False}

    text = (row.text or "").strip() or None
    image_url = (row.image_url or "").strip() or None
    return {
        "text": text,
        "image_url": image_url,
        "has_content": bool(text or image_url),
    }
