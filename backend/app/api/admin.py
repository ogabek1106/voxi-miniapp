#backend/app/api/admin.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.config import ADMIN_IDS
from app.models import User, AppAnnouncement

router = APIRouter(prefix="/__admin", tags=["admin"])


class AnnouncementIn(BaseModel):
    text: str | None = None
    image_url: str | None = None

@router.get("/db-stats")
def get_db_stats(telegram_id: int, db: Session = Depends(get_db)):
    # 🔐 Admin check (same logic as /me)
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    users_count = db.query(User).count()

    return {
        "users": users_count,
        "tables": {
            "users": users_count
        }
    }
@router.get("/users")
def list_users(telegram_id: int, db: Session = Depends(get_db)):
    # 🔐 Admin only
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    users = (
        db.query(User)
        .order_by(User.id.desc())   # newest → oldest
        .all()
    )

    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "telegram_id": u.telegram_id,
                "name": u.name,
            }
            for u in users
        ]
    }
@router.get("/drop-users-table")
def drop_users_table(telegram_id: int, db: Session = Depends(get_db)):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    # Dangerous but OK for MVP
    User.__table__.drop(db.bind, checkfirst=True)

    return {"status": "ok", "message": "users table dropped"}


@router.get("/announcement")
def get_announcement_admin(telegram_id: int, db: Session = Depends(get_db)):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

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


@router.post("/announcement")
def save_announcement(payload: AnnouncementIn, telegram_id: int, db: Session = Depends(get_db)):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    text = (payload.text or "").strip() or None
    image_url = (payload.image_url or "").strip() or None

    row = db.query(AppAnnouncement).filter(AppAnnouncement.id == 1).first()
    if not row:
        row = AppAnnouncement(id=1)
        db.add(row)

    row.text = text
    row.image_url = image_url
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)

    return {
        "text": row.text,
        "image_url": row.image_url,
        "has_content": bool(row.text or row.image_url),
    }


