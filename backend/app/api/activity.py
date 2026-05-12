from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.schemas.activity import ActivityHeartbeatIn
from app.services import activity_service

router = APIRouter(tags=["activity"])


def require_admin(telegram_id: int):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.post("/activity/heartbeat")
def heartbeat(payload: ActivityHeartbeatIn, db: Session = Depends(get_db)):
    session = activity_service.record_heartbeat(db, payload)
    return {"ok": True, "session_id": session.id}


@router.get("/admin/live-dashboard")
def live_dashboard(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    return {"ok": True, **activity_service.build_dashboard(db)}
