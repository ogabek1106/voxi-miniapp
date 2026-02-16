# backend/app/api/me.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.config import ADMIN_IDS
from app.models import User

router = APIRouter()

@router.get("/me")
def get_me(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "telegram_id": user.telegram_id,
        "name": user.name,
        "is_admin": user.telegram_id in ADMIN_IDS
    }
