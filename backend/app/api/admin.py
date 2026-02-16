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
