from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timezone

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import ReadingProgress, ReadingTest, User
from app.api.mock_tests import _finalize_progress, _is_time_up, _query_questions_for_test, _utcnow

router = APIRouter(prefix="/__admin", tags=["admin-reading-stats"])


def _to_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _finish_type(progress: ReadingProgress) -> str | None:
    if not progress.is_submitted or not progress.submitted_at:
        return None
    if progress.ends_at:
        try:
            if _to_utc(progress.submitted_at) >= _to_utc(progress.ends_at):
                return "auto"
        except Exception:
            # Keep stats endpoint resilient even if there are legacy datetime rows.
            return "manual"
    return "manual"


@router.get("/reading-stats")
def list_reading_stats(telegram_id: int, db: Session = Depends(get_db)):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    # Auto-submit expired unfinished attempts so stats stay accurate,
    # even if a user left and never returned.
    now = _utcnow()
    unfinished = (
        db.query(ReadingProgress, User)
        .join(User, ReadingProgress.user_id == User.id)
        .filter(
            ReadingProgress.is_submitted == False,
            ReadingProgress.ends_at != None
        )
        .all()
    )
    changed = False
    questions_cache = {}
    for progress, user in unfinished:
        if int(user.telegram_id) in ADMIN_IDS:
            continue
        if not _is_time_up(progress.ends_at, now):
            continue
        if progress.test_id not in questions_cache:
            questions_cache[progress.test_id] = _query_questions_for_test(db, progress.test_id)
        _finalize_progress(progress, questions_cache[progress.test_id], now)
        db.add(progress)
        changed = True
    if changed:
        db.commit()

    rows = (
        db.query(ReadingProgress, User, ReadingTest)
        .join(User, ReadingProgress.user_id == User.id)
        .join(ReadingTest, ReadingProgress.test_id == ReadingTest.id)
        .order_by(ReadingProgress.submitted_at.desc(), ReadingProgress.updated_at.desc())
        .all()
    )

    items = []
    for progress, user, test in rows:
        raw_score = progress.raw_score
        max_score = progress.max_score
        score_text = None
        if raw_score is not None and max_score is not None:
            score_text = f"{raw_score}/{max_score}"

        items.append({
            "telegram_id": user.telegram_id,
            "name": user.name,
            "reading_title": test.title,
            "started_at": _to_utc(progress.started_at).isoformat() if progress.started_at else None,
            "finished_at": _to_utc(progress.submitted_at).isoformat() if progress.submitted_at else None,
            "finish_type": _finish_type(progress),
            "score": score_text,
            "band": float(progress.band_score) if progress.band_score is not None else None,
        })

    return {
        "total": len(items),
        "items": items
    }
