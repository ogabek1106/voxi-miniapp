from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS
from app.deps import get_db
from app.services.admin_transactions_service import (
    get_transaction_detail,
    list_transactions,
    parse_filters,
    transactions_summary,
)


router = APIRouter(prefix="/admin/transactions", tags=["admin-transactions"])


def require_admin(telegram_id: int) -> None:
    if int(telegram_id or 0) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


def _params(request: Request, telegram_id: int, **extra: Any) -> dict[str, Any]:
    data = dict(request.query_params)
    data["telegram_id"] = telegram_id
    data.update({key: value for key, value in extra.items() if value is not None})
    return data


@router.get("")
def admin_transactions(
    request: Request,
    telegram_id: int = Query(...),
    db: Session = Depends(get_db),
):
    require_admin(telegram_id)
    return list_transactions(db, parse_filters(_params(request, telegram_id)))


@router.get("/summary")
def admin_transactions_summary(
    request: Request,
    telegram_id: int = Query(...),
    db: Session = Depends(get_db),
):
    require_admin(telegram_id)
    return transactions_summary(db, parse_filters(_params(request, telegram_id)))


@router.get("/{order_ref}")
def admin_transaction_detail(
    order_ref: str,
    request: Request,
    telegram_id: int = Query(...),
    db: Session = Depends(get_db),
):
    require_admin(telegram_id)
    return get_transaction_detail(db, order_ref, parse_filters(_params(request, telegram_id)))
