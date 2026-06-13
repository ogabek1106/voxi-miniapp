from sqlalchemy.orm import Session, joinedload

from app.models_learning import LearningDay, LearningDayBlock, LearningMonth


MONTHS = [
    {"number": 1, "name": "January", "days": 31},
    {"number": 2, "name": "February", "days": 28},
    {"number": 3, "name": "March", "days": 31},
    {"number": 4, "name": "April", "days": 30},
    {"number": 5, "name": "May", "days": 31},
    {"number": 6, "name": "June", "days": 30},
    {"number": 7, "name": "July", "days": 31},
    {"number": 8, "name": "August", "days": 31},
    {"number": 9, "name": "September", "days": 30},
    {"number": 10, "name": "October", "days": 31},
    {"number": 11, "name": "November", "days": 30},
    {"number": 12, "name": "December", "days": 31},
]

MONTH_BY_NUMBER = {item["number"]: item for item in MONTHS}


def default_month_name(month_number: int | None) -> str | None:
    item = MONTH_BY_NUMBER.get(int(month_number or 0))
    return item["name"] if item else None


def default_month_day_count(month_number: int | None) -> int | None:
    item = MONTH_BY_NUMBER.get(int(month_number or 0))
    return item["days"] if item else None


def ensure_default_days_for_month(db: Session, month: LearningMonth) -> None:
    day_count = default_month_day_count(month.month_number)
    if not day_count:
        return
    existing_numbers = {
        int(day_number)
        for (day_number,) in db.query(LearningDay.day_number).filter(LearningDay.month_id == month.id).all()
        if day_number is not None
    }
    for day_number in range(1, day_count + 1):
        if day_number in existing_numbers:
            continue
        db.add(LearningDay(
            month_id=month.id,
            day_number=day_number,
            status="draft",
        ))


def ensure_default_plan(db: Session) -> None:
    changed = False
    for item in MONTHS:
        month = (
            db.query(LearningMonth)
            .filter(LearningMonth.month_number == item["number"])
            .order_by(LearningMonth.id.asc())
            .first()
        )
        if not month:
            month = LearningMonth(
                month_number=item["number"],
                title=item["name"],
                status="draft",
            )
            db.add(month)
            db.flush()
            changed = True
        before_count = db.query(LearningDay).filter(LearningDay.month_id == month.id).count()
        ensure_default_days_for_month(db, month)
        after_count = db.query(LearningDay).filter(LearningDay.month_id == month.id).count()
        if after_count != before_count:
            changed = True
    if changed:
        db.commit()


def month_payload(month: LearningMonth, include_days: bool = False) -> dict:
    days = list(month.days or [])
    month_name = default_month_name(month.month_number)
    payload = {
        "id": month.id,
        "month_number": month.month_number,
        "month_name": month_name,
        "title": month.title,
        "description": month.description,
        "status": month.status or "draft",
        "days_count": len(days),
        "standard_days_count": default_month_day_count(month.month_number),
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
    ensure_default_plan(db)
    return (
        db.query(LearningMonth)
        .options(joinedload(LearningMonth.days))
        .order_by(LearningMonth.month_number.asc().nullsfirst(), LearningMonth.id.asc())
        .all()
    )


def get_month(db: Session, month_id: int) -> LearningMonth | None:
    month = (
        db.query(LearningMonth)
        .options(joinedload(LearningMonth.days).joinedload(LearningDay.blocks))
        .filter(LearningMonth.id == int(month_id))
        .first()
    )
    if month:
        ensure_default_days_for_month(db, month)
        db.commit()
        month = (
            db.query(LearningMonth)
            .options(joinedload(LearningMonth.days).joinedload(LearningDay.blocks))
            .filter(LearningMonth.id == int(month_id))
            .first()
        )
    return month


def list_days(db: Session, month_id: int) -> list[LearningDay]:
    month = db.query(LearningMonth).filter(LearningMonth.id == int(month_id)).first()
    if month:
        ensure_default_days_for_month(db, month)
        db.commit()
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
