from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import User
from app.schemas.gamification import MonthlyRewardClaimIn
from app.services import gamification_service as service


router = APIRouter(prefix="/me/gamification", tags=["gamification"])


def _resolve_user(db: Session, user_id: int | None, telegram_id: int | None) -> User:
    user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
    if not user and telegram_id:
        user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    return user


@router.get("")
def get_my_gamification(user_id: int | None = None, telegram_id: int | None = None, db: Session = Depends(get_db)):
    user = _resolve_user(db, user_id, telegram_id)
    payload = service.build_user_gamification_payload(db, user.id)
    db.commit()
    return payload


@router.post("/claim-monthly-reward")
def claim_monthly_reward(
    payload: MonthlyRewardClaimIn,
    user_id: int | None = None,
    telegram_id: int | None = None,
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_id, telegram_id)
    return service.claim_monthly_reward(db, user.id, payload.milestone_day)
