from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import WordMergeFamily, WordMergeMove, WordMergeSession, WordMergeStage


VALID_TARGETS = [8, 16, 32, 64, 128, 256, 512, 1024]


def clean_optional(value):
    value = str(value or "").strip()
    return value or None


def merge_values(mastery_target: int) -> list[int]:
    target = int(mastery_target or 128)
    if target not in VALID_TARGETS:
        target = 128
    values = []
    current = 2
    while current < target:
        values.append(current)
        current *= 2
    return values


def build_ladder(stages: list, mastery_target: int = 128) -> list[dict]:
    words = list(stages or [])
    values = merge_values(mastery_target)
    if not words:
        return [{"value": value, "english_word": "", "uzbek_meaning": ""} for value in values]
    last_stage_index = max(0, len(words) - 1)
    usable_slots = max(1, len(values) - 1)
    ladder = []
    for index, value in enumerate(values):
        stage_index = round(index * last_stage_index / usable_slots) if usable_slots else 0
        if index == len(values) - 1 and len(values) > len(words):
            stage_index = last_stage_index
        stage = words[min(stage_index, last_stage_index)]
        ladder.append({
            "value": value,
            "english_word": stage.english_word if hasattr(stage, "english_word") else stage.get("english_word"),
            "uzbek_meaning": stage.uzbek_meaning if hasattr(stage, "uzbek_meaning") else stage.get("uzbek_meaning"),
            "stage_index": stage_index,
        })
    return ladder


def serialize_stage(stage: WordMergeStage) -> dict:
    return {
        "id": stage.id,
        "english_word": stage.english_word,
        "uzbek_meaning": stage.uzbek_meaning,
        "order_index": stage.order_index,
    }


def serialize_family(family: WordMergeFamily, include_ladder: bool = True) -> dict:
    stages = list(family.stages or [])
    data = {
        "id": family.id,
        "title": family.title,
        "cefr_level": family.cefr_level,
        "category": family.category,
        "status": family.status,
        "mastery_target": family.mastery_target,
        "created_at": family.created_at.isoformat() if family.created_at else None,
        "updated_at": family.updated_at.isoformat() if family.updated_at else None,
        "stages": [serialize_stage(stage) for stage in stages],
    }
    if include_ladder:
        data["ladder"] = build_ladder(stages, family.mastery_target)
    return data


def list_families(db: Session) -> list[WordMergeFamily]:
    return (
        db.query(WordMergeFamily)
        .options(joinedload(WordMergeFamily.stages))
        .order_by(WordMergeFamily.id.desc())
        .all()
    )


def list_active_families(db: Session) -> list[WordMergeFamily]:
    return (
        db.query(WordMergeFamily)
        .options(joinedload(WordMergeFamily.stages))
        .filter(WordMergeFamily.status == "active")
        .all()
    )


def get_family(db: Session, family_id: int) -> WordMergeFamily | None:
    return (
        db.query(WordMergeFamily)
        .options(joinedload(WordMergeFamily.stages))
        .filter(WordMergeFamily.id == family_id)
        .first()
    )


def _replace_stages(db: Session, family: WordMergeFamily, stages):
    for existing in list(family.stages or []):
        db.delete(existing)
    db.flush()
    for index, stage in enumerate(stages or []):
        db.add(WordMergeStage(
            family_id=family.id,
            english_word=stage.english_word,
            uzbek_meaning=stage.uzbek_meaning,
            order_index=index,
        ))


def create_family(db: Session, payload) -> WordMergeFamily:
    family = WordMergeFamily(
        title=payload.title,
        cefr_level=clean_optional(payload.cefr_level),
        category=clean_optional(payload.category),
        status=payload.status or "inactive",
        mastery_target=int(payload.mastery_target or 128),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(family)
    db.flush()
    _replace_stages(db, family, payload.stages)
    db.commit()
    return get_family(db, family.id)


def update_family(db: Session, family_id: int, payload) -> WordMergeFamily | None:
    family = get_family(db, family_id)
    if not family:
        return None
    family.title = payload.title
    family.cefr_level = clean_optional(payload.cefr_level)
    family.category = clean_optional(payload.category)
    family.status = payload.status or family.status or "inactive"
    family.mastery_target = int(payload.mastery_target or 128)
    family.updated_at = datetime.utcnow()
    _replace_stages(db, family, payload.stages)
    db.commit()
    return get_family(db, family_id)


def delete_family(db: Session, family_id: int) -> bool:
    family = get_family(db, family_id)
    if not family:
        return False
    db.delete(family)
    db.commit()
    return True


def set_status(db: Session, family_id: int, status: str) -> WordMergeFamily | None:
    if status not in {"active", "inactive"}:
        raise HTTPException(status_code=422, detail="invalid_status")
    family = get_family(db, family_id)
    if not family:
        return None
    family.status = status
    family.updated_at = datetime.utcnow()
    db.commit()
    return get_family(db, family_id)


def build_game_payload(db: Session) -> dict:
    families = [
        family for family in list_active_families(db)
        if len(family.stages or []) >= 2
    ]
    return {
        "families": [serialize_family(family) for family in families],
        "grid_size": 4,
        "active_family_limit": 4,
    }


def create_session(db: Session, payload) -> WordMergeSession:
    session = WordMergeSession(
        user_id=payload.user_id,
        telegram_id=payload.telegram_id,
        score=0,
        mastered_count=0,
        moves_count=0,
        status="started",
        board_state=None,
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def finish_session(db: Session, session_id: int, payload) -> WordMergeSession:
    session = db.query(WordMergeSession).filter(WordMergeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="word_merge_session_not_found")
    session.user_id = payload.user_id or session.user_id
    session.telegram_id = payload.telegram_id or session.telegram_id
    session.score = max(0, int(payload.score or 0))
    session.mastered_count = max(0, int(payload.mastered_count or 0))
    session.moves_count = max(0, int(payload.moves_count or 0))
    session.status = payload.status or "finished"
    session.board_state = payload.board_state
    session.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def record_move(db: Session, session_id: int, direction: str, score_after: int, mastered_after: int) -> WordMergeMove:
    move = WordMergeMove(
        session_id=session_id,
        direction=direction,
        score_after=max(0, int(score_after or 0)),
        mastered_after=max(0, int(mastered_after or 0)),
        created_at=datetime.utcnow(),
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


def simple_stats(db: Session) -> dict:
    sessions = db.query(WordMergeSession).order_by(WordMergeSession.started_at.desc()).limit(50).all()
    total_sessions = db.query(WordMergeSession).count()
    total_mastered = sum(int(session.mastered_count or 0) for session in sessions)
    best_score = max([int(session.score or 0) for session in sessions] or [0])
    return {
        "summary": {
            "total_sessions": total_sessions,
            "recent_mastered": total_mastered,
            "best_recent_score": best_score,
        },
        "items": [
            {
                "id": session.id,
                "telegram_id": session.telegram_id,
                "score": session.score,
                "mastered_count": session.mastered_count,
                "moves_count": session.moves_count,
                "status": session.status,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "finished_at": session.finished_at.isoformat() if session.finished_at else None,
            }
            for session in sessions
        ],
    }
