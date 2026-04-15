from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.models import ReadingProgress, ReadingTest, User

router = APIRouter(prefix="/__admin", tags=["admin-reading-stats"])


def _finish_type(progress: ReadingProgress) -> str | None:
    if not progress.is_submitted or not progress.submitted_at:
        return None
    if progress.ends_at and progress.submitted_at >= progress.ends_at:
        return "auto"
    return "manual"


@router.get("/reading-stats")
def list_reading_stats(telegram_id: int, db: Session = Depends(get_db)):
    if telegram_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")

    rows = (
        db.query(ReadingProgress, User, ReadingTest)
        .join(User, ReadingProgress.user_id == User.id)
        .join(ReadingTest, ReadingProgress.test_id == ReadingTest.id)
        .order_by(
            ReadingProgress.submitted_at.is_(None).asc(),
            ReadingProgress.submitted_at.desc(),
            ReadingProgress.updated_at.is_(None).asc(),
            ReadingProgress.updated_at.desc()
        )
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
            "started_at": progress.started_at.isoformat() if progress.started_at else None,
            "finished_at": progress.submitted_at.isoformat() if progress.submitted_at else None,
            "finish_type": _finish_type(progress),
            "score": score_text,
            "band": float(progress.band_score) if progress.band_score is not None else None,
        })

    return {
        "total": len(items),
        "items": items
    }
