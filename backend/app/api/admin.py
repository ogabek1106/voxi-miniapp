#backend/app/api/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.config import ADMIN_IDS
from app.models import User

router = APIRouter(prefix="/__admin", tags=["admin"])

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


