from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models_payments import PaymentOrder


router = APIRouter(prefix="/payments/orders", tags=["payment-orders"])


@router.get("/{order_ref}/status")
def payment_order_status(order_ref: str, telegram_id: int = Query(...), db: Session = Depends(get_db)):
    order = db.query(PaymentOrder).filter(PaymentOrder.order_ref == str(order_ref or "").strip()).first()
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    if int(order.telegram_id or 0) != int(telegram_id or 0):
        raise HTTPException(status_code=403, detail="order_forbidden")
    return {
        "order_ref": order.order_ref,
        "provider": order.payment_provider,
        "status": order.status,
        "fulfillment_status": order.fulfillment_status,
        "paid_at": order.payment_completed_at.isoformat() if order.payment_completed_at else None,
        "fulfilled_at": order.fulfilled_at.isoformat() if order.fulfilled_at else None,
    }
