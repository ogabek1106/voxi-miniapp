from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models_learning import LearningDay, LearningDayBlock, LearningMonth
from app.schemas.learning import LearningBlockIn, LearningBlockReorderIn, LearningDayIn, LearningMonthIn
from app.services import learning_service as service


router = APIRouter(prefix="/admin/learning", tags=["admin-learning"])


def require_admin(telegram_id: int):
    if int(telegram_id or 0) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="admin_only")


def clean_text(value: str | None) -> str | None:
    value = str(value or "").strip()
    return value or None


def clean_int(value: int | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


@router.get("/months")
def list_months(telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    rows = service.list_months(db)
    return {"ok": True, "months": [service.month_payload(row) for row in rows]}


@router.post("/months")
def create_month(payload: LearningMonthIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = LearningMonth(
        month_number=clean_int(payload.month_number),
        title=clean_text(payload.title),
        description=clean_text(payload.description),
        status=clean_text(payload.status) or "draft",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "month": service.month_payload(row)}


@router.get("/months/{month_id}")
def get_month(month_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_month(db, month_id)
    if not row:
        raise HTTPException(status_code=404, detail="month_not_found")
    return {"ok": True, "month": service.month_payload(row, include_days=True)}


@router.put("/months/{month_id}")
def update_month(month_id: int, payload: LearningMonthIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_month(db, month_id)
    if not row:
        raise HTTPException(status_code=404, detail="month_not_found")
    row.month_number = clean_int(payload.month_number)
    row.title = clean_text(payload.title)
    row.description = clean_text(payload.description)
    row.status = clean_text(payload.status) or "draft"
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "month": service.month_payload(row)}


@router.delete("/months/{month_id}")
def delete_month(month_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_month(db, month_id)
    if not row:
        raise HTTPException(status_code=404, detail="month_not_found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/months/{month_id}/days")
def list_days(month_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.get_month(db, month_id):
        raise HTTPException(status_code=404, detail="month_not_found")
    rows = service.list_days(db, month_id)
    return {"ok": True, "days": [service.day_payload(row, include_blocks=False) for row in rows]}


@router.post("/months/{month_id}/days")
def create_day(month_id: int, payload: LearningDayIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.get_month(db, month_id):
        raise HTTPException(status_code=404, detail="month_not_found")
    row = LearningDay(
        month_id=int(month_id),
        day_number=clean_int(payload.day_number),
        title=clean_text(payload.title),
        subtitle=clean_text(payload.subtitle),
        status=clean_text(payload.status) or "draft",
        estimated_minutes=clean_int(payload.estimated_minutes),
        xp_reward=clean_int(payload.xp_reward),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "day": service.day_payload(row)}


@router.get("/days/{day_id}")
def get_day(day_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_day(db, day_id)
    if not row:
        raise HTTPException(status_code=404, detail="day_not_found")
    return {"ok": True, "day": service.day_payload(row)}


@router.put("/days/{day_id}")
def update_day(day_id: int, payload: LearningDayIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_day(db, day_id)
    if not row:
        raise HTTPException(status_code=404, detail="day_not_found")
    row.day_number = clean_int(payload.day_number)
    row.title = clean_text(payload.title)
    row.subtitle = clean_text(payload.subtitle)
    row.status = clean_text(payload.status) or "draft"
    row.estimated_minutes = clean_int(payload.estimated_minutes)
    row.xp_reward = clean_int(payload.xp_reward)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "day": service.day_payload(row)}


@router.delete("/days/{day_id}")
def delete_day(day_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_day(db, day_id)
    if not row:
        raise HTTPException(status_code=404, detail="day_not_found")
    month_id = row.month_id
    db.delete(row)
    db.commit()
    return {"ok": True, "month_id": month_id}


@router.post("/days/{day_id}/blocks")
def create_block(day_id: int, payload: LearningBlockIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    if not service.get_day(db, day_id):
        raise HTTPException(status_code=404, detail="day_not_found")
    row = LearningDayBlock(
        day_id=int(day_id),
        block_type=clean_text(payload.block_type),
        sort_order=clean_int(payload.sort_order) or service.next_block_order(db, day_id),
        content_json=payload.content_json or {},
        is_required=bool(payload.is_required),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "block": service.block_payload(row)}


@router.put("/blocks/{block_id}")
def update_block(block_id: int, payload: LearningBlockIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_block(db, block_id)
    if not row:
        raise HTTPException(status_code=404, detail="block_not_found")
    row.block_type = clean_text(payload.block_type)
    row.sort_order = clean_int(payload.sort_order) or int(row.sort_order or 0)
    row.content_json = payload.content_json or {}
    row.is_required = bool(payload.is_required)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "block": service.block_payload(row)}


@router.delete("/blocks/{block_id}")
def delete_block(block_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_block(db, block_id)
    if not row:
        raise HTTPException(status_code=404, detail="block_not_found")
    day_id = row.day_id
    db.delete(row)
    db.commit()
    return {"ok": True, "day_id": day_id}


@router.post("/days/{day_id}/blocks/reorder")
def reorder_blocks(day_id: int, payload: LearningBlockReorderIn, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    day = service.get_day(db, day_id)
    if not day:
        raise HTTPException(status_code=404, detail="day_not_found")
    blocks = {int(block.id): block for block in day.blocks}
    for index, block_id in enumerate(payload.block_ids, start=1):
        block = blocks.get(int(block_id))
        if block:
            block.sort_order = index
            db.add(block)
    db.commit()
    db.refresh(day)
    return {"ok": True, "day": service.day_payload(service.get_day(db, day_id))}


@router.get("/days/{day_id}/preview")
def preview_day(day_id: int, telegram_id: int, db: Session = Depends(get_db)):
    require_admin(telegram_id)
    row = service.get_day(db, day_id)
    if not row:
        raise HTTPException(status_code=404, detail="day_not_found")
    return {"ok": True, "day": service.day_payload(row)}
