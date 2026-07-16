from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models_payments import PaymentOrder
from app.services.auth_service import get_session_user


router = APIRouter(prefix="/payments/orders", tags=["payment-orders"])


@router.get("/{order_ref}/status")
def payment_order_status(
    order_ref: str,
    request: Request,
    telegram_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == str(order_ref or "").strip()).first()
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")

    user = get_session_user(db, request)
    session_allowed = bool(user and int(order.user_id or 0) == int(user.id))
    telegram_allowed = bool(telegram_id and order.telegram_id and int(order.telegram_id) == int(telegram_id))
    if not session_allowed and not telegram_allowed:
        raise HTTPException(status_code=403, detail="order_forbidden")
    return {
        "order_ref": order.order_ref,
        "provider": order.payment_provider,
        "status": order.status,
        "fulfillment_status": order.fulfillment_status,
        "paid_at": order.payment_completed_at.isoformat() if order.payment_completed_at else None,
        "fulfilled_at": order.fulfilled_at.isoformat() if order.fulfilled_at else None,
    }
