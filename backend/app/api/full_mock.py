from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from app.services.full_mock_result import build_full_mock_result

router = APIRouter(prefix="/mock-tests", tags=["full-mock"])


class FullMockResultIn(BaseModel):
    telegram_id: int


@router.post("/{mock_id}/full-result")
def get_or_build_full_result(mock_id: int, payload: FullMockResultIn, db: Session = Depends(get_db)):
    return build_full_mock_result(db, mock_id, int(payload.telegram_id))
