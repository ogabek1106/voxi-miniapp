# backend/app/api/me.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models import User
from app.config import ADMIN_IDS

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None

@router.get("/me")
def get_me(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(telegram_id=telegram_id, name=None)
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "name": user.name,
        "is_admin": user.telegram_id in ADMIN_IDS
    }


@router.post("/me")
def update_me(telegram_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(telegram_id=telegram_id)
        db.add(user)

    user.name = data.name
    user.surname = data.surname
    db.commit()
    return {"status": "ok"}
