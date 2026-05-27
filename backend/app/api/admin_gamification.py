from uuid import uuid4
import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import Badge, MonthlyRewardRule
from app.schemas.gamification import BadgeIn, MonthlyRewardRuleIn
from app.services import gamification_service as service


router = APIRouter(prefix="/admin/gamification", tags=["admin-gamification"])
UPLOAD_DIR = "/data/media"
ALLOWED_ICON_TYPES = {"image/png", "image/webp"}


def require_admin(telegram_id: int):
    if int(telegram_id) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="admin_only")


def _badge_payload(row: Badge) -> dict:
    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "description": row.description,
        "type": row.type,
        "icon_url": row.icon_url,
        "unlock_condition_type": row.unlock_condition_type,
        "unlock_condition_value": row.unlock_condition_value,
        "is_active": bool(row.is_active),
        "sort_order": int(row.sort_order or 0),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _reward_payload(row: MonthlyRewardRule) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "month_length": row.month_length,
        "milestone_day": row.milestone_day,
        "reward_type": row.reward_type,
        "reward_payload": row.reward_payload or {},
        "chest_type": row.chest_type,
        "is_active": bool(row.is_active),
        "sort_order": int(row.sort_order or 0),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/badges")
def list_badges(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    rows = db.query(Badge).order_by(Badge.sort_order.asc(), Badge.id.asc()).all()
    return {"ok": True, "badges": [_badge_payload(row) for row in rows]}


@router.post("/badges")
def create_badge(payload: BadgeIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if db.query(Badge).filter(Badge.code == payload.code).first():
        raise HTTPException(status_code=409, detail="badge_code_exists")
    row = Badge(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "badge": _badge_payload(row)}


@router.put("/badges/{badge_id}")
def update_badge(badge_id: int, payload: BadgeIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = db.query(Badge).filter(Badge.id == int(badge_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="badge_not_found")
    existing = db.query(Badge).filter(Badge.code == payload.code, Badge.id != row.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="badge_code_exists")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "badge": _badge_payload(row)}


@router.delete("/badges/{badge_id}")
def deactivate_badge(badge_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = db.query(Badge).filter(Badge.id == int(badge_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="badge_not_found")
    row.is_active = False
    db.add(row)
    db.commit()
    return {"ok": True}


@router.post("/badges/upload-icon")
async def upload_badge_icon(telegram_id: int, file: UploadFile = File(...)):
    require_admin(telegram_id)
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_ICON_TYPES:
        raise HTTPException(status_code=400, detail="png_or_webp_required")
    content = await file.read()
    if len(content) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="file_too_large")
    ext = "webp" if content_type == "image/webp" else "png"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"badge-{uuid4()}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as handle:
        handle.write(content)
    return {"ok": True, "url": f"/media/{filename}"}


@router.get("/monthly-rewards")
def list_monthly_rewards(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    rows = db.query(MonthlyRewardRule).order_by(MonthlyRewardRule.month_length.asc().nullsfirst(), MonthlyRewardRule.milestone_day.asc(), MonthlyRewardRule.sort_order.asc()).all()
    return {"ok": True, "rewards": [_reward_payload(row) for row in rows]}


@router.post("/monthly-rewards")
def create_monthly_reward(payload: MonthlyRewardRuleIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = MonthlyRewardRule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "reward": _reward_payload(row)}


@router.put("/monthly-rewards/{reward_id}")
def update_monthly_reward(reward_id: int, payload: MonthlyRewardRuleIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = db.query(MonthlyRewardRule).filter(MonthlyRewardRule.id == int(reward_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="reward_not_found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "reward": _reward_payload(row)}


@router.delete("/monthly-rewards/{reward_id}")
def deactivate_monthly_reward(reward_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = db.query(MonthlyRewardRule).filter(MonthlyRewardRule.id == int(reward_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="reward_not_found")
    row.is_active = False
    db.add(row)
    db.commit()
    return {"ok": True}

