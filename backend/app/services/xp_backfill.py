from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import (
    FullMockResult,
    ListeningProgress,
    ReadingProgress,
    ShadowWritingAttempt,
    SpeakingProgress,
    VocabularyOddOneOutAttempt,
    WordShuffleSession,
    WritingProgress,
)
from app.services import xp_service


def backfill_xp_from_existing_activity(db: Session, limit: int | None = None) -> dict:
    cap = int(limit or 0) or None
    summary = {
        "shadow_writing_attempts": 0,
        "odd_one_out_attempts": 0,
        "word_shuffle_sessions": 0,
        "reading_progress": 0,
        "listening_progress": 0,
        "writing_progress": 0,
        "speaking_progress": 0,
        "full_mock_results": 0,
    }

    query = (
        db.query(ShadowWritingAttempt)
        .filter(ShadowWritingAttempt.completed_at.isnot(None))
        .order_by(ShadowWritingAttempt.id.asc())
    )
    for attempt in query.limit(cap).all() if cap else query.all():
        xp_service.award_shadow_writing_attempt(db, attempt)
        summary["shadow_writing_attempts"] += 1

    query = db.query(VocabularyOddOneOutAttempt).order_by(VocabularyOddOneOutAttempt.id.asc())
    for attempt in query.limit(cap).all() if cap else query.all():
        xp_service.award_odd_one_out_attempt(db, attempt)
        summary["odd_one_out_attempts"] += 1

    query = (
        db.query(WordShuffleSession)
        .filter(WordShuffleSession.finished_at.isnot(None))
        .order_by(WordShuffleSession.id.asc())
    )
    for session in query.limit(cap).all() if cap else query.all():
        xp_service.award_word_shuffle_session(db, session)
        summary["word_shuffle_sessions"] += 1

    query = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.is_submitted == True)  # noqa: E712
        .order_by(ReadingProgress.id.asc())
    )
    for progress in query.limit(cap).all() if cap else query.all():
        xp_service.award_reading_completion(db, progress)
        summary["reading_progress"] += 1

    query = (
        db.query(ListeningProgress)
        .filter(ListeningProgress.is_submitted == True)  # noqa: E712
        .order_by(ListeningProgress.id.asc())
    )
    for progress in query.limit(cap).all() if cap else query.all():
        xp_service.award_listening_completion(db, progress)
        summary["listening_progress"] += 1

    query = (
        db.query(WritingProgress)
        .filter(WritingProgress.is_submitted == True)  # noqa: E712
        .filter(WritingProgress.session_mode != "full_mock")
        .order_by(WritingProgress.id.asc())
    )
    for progress in query.limit(cap).all() if cap else query.all():
        xp_service.award_writing_completion(db, progress)
        summary["writing_progress"] += 1

    query = (
        db.query(SpeakingProgress)
        .filter(SpeakingProgress.is_submitted == True)  # noqa: E712
        .filter(SpeakingProgress.session_mode != "full_mock")
        .order_by(SpeakingProgress.id.asc())
    )
    for progress in query.limit(cap).all() if cap else query.all():
        xp_service.award_speaking_completion(db, progress)
        summary["speaking_progress"] += 1

    query = (
        db.query(FullMockResult)
        .filter(FullMockResult.status == "completed")
        .order_by(FullMockResult.id.asc())
    )
    for result in query.limit(cap).all() if cap else query.all():
        xp_service.award_full_mock_result(db, result)
        summary["full_mock_results"] += 1

    return summary
