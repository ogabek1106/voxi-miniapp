from sqlalchemy.orm import Session, joinedload

from app.models_learning import LearningDay, LearningDayBlock, LearningMonth


def month_payload(month: LearningMonth, include_days: bool = False) -> dict:
    days = list(month.days or [])
    payload = {
        "id": month.id,
        "month_number": month.month_number,
        "title": month.title,
        "description": month.description,
        "status": month.status or "draft",
        "days_count": len(days),
        "created_at": month.created_at.isoformat() if month.created_at else None,
        "updated_at": month.updated_at.isoformat() if month.updated_at else None,
    }
    if include_days:
        payload["days"] = [day_payload(day) for day in sorted(days, key=lambda item: ((item.day_number or 0), item.id))]
    return payload


def day_payload(day: LearningDay, include_blocks: bool = True) -> dict:
    blocks = sorted(list(day.blocks or []), key=lambda item: ((item.sort_order or 0), item.id))
    payload = {
        "id": day.id,
        "month_id": day.month_id,
        "day_number": day.day_number,
        "title": day.title,
        "subtitle": day.subtitle,
        "status": day.status or "draft",
        "estimated_minutes": day.estimated_minutes,
        "xp_reward": day.xp_reward,
        "blocks_count": len(blocks),
        "created_at": day.created_at.isoformat() if day.created_at else None,
        "updated_at": day.updated_at.isoformat() if day.updated_at else None,
    }
    if include_blocks:
        payload["blocks"] = [block_payload(block) for block in blocks]
    return payload


def block_payload(block: LearningDayBlock) -> dict:
    return {
        "id": block.id,
        "day_id": block.day_id,
        "block_type": block.block_type,
        "sort_order": int(block.sort_order or 0),
        "content_json": block.content_json or {},
        "is_required": bool(block.is_required),
        "created_at": block.created_at.isoformat() if block.created_at else None,
        "updated_at": block.updated_at.isoformat() if block.updated_at else None,
    }


def list_months(db: Session) -> list[LearningMonth]:
    return (
        db.query(LearningMonth)
        .options(joinedload(LearningMonth.days))
        .order_by(LearningMonth.month_number.asc().nullsfirst(), LearningMonth.id.asc())
        .all()
    )


def get_month(db: Session, month_id: int) -> LearningMonth | None:
    return (
        db.query(LearningMonth)
        .options(joinedload(LearningMonth.days).joinedload(LearningDay.blocks))
        .filter(LearningMonth.id == int(month_id))
        .first()
    )


def list_days(db: Session, month_id: int) -> list[LearningDay]:
    return (
        db.query(LearningDay)
        .options(joinedload(LearningDay.blocks))
        .filter(LearningDay.month_id == int(month_id))
        .order_by(LearningDay.day_number.asc().nullsfirst(), LearningDay.id.asc())
        .all()
    )


def get_day(db: Session, day_id: int) -> LearningDay | None:
    return (
        db.query(LearningDay)
        .options(joinedload(LearningDay.month), joinedload(LearningDay.blocks))
        .filter(LearningDay.id == int(day_id))
        .first()
    )


def get_block(db: Session, block_id: int) -> LearningDayBlock | None:
    return db.query(LearningDayBlock).filter(LearningDayBlock.id == int(block_id)).first()


def next_block_order(db: Session, day_id: int) -> int:
    rows = db.query(LearningDayBlock).filter(LearningDayBlock.day_id == int(day_id)).all()
    if not rows:
        return 1
    return max(int(row.sort_order or 0) for row in rows) + 1
