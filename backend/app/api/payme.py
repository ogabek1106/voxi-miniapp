from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.payme import VCoinPaymeCheckoutRequest
from app.services.payme_service import (
    access_denied_error,
    check_basic_auth,
    create_vcoin_checkout_order,
    dispatch_payme_method,
    jsonrpc_error,
)


router = APIRouter(prefix="/payments/payme", tags=["payme"])


@router.post("/merchant")
async def payme_merchant(
    request: Request,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    request_id = payload.get("id") if isinstance(payload, dict) else None
    if not check_basic_auth(authorization):
        return jsonrpc_error(request_id, access_denied_error())
    if not isinstance(payload, dict):
        return jsonrpc_error(request_id, access_denied_error())
    return dispatch_payme_method(db, payload)


@router.post("/vcoins/checkout")
def create_vcoin_payme_checkout(payload: VCoinPaymeCheckoutRequest, db: Session = Depends(get_db)):
    return create_vcoin_checkout_order(
        db,
        telegram_id=payload.telegram_id,
        coins=payload.coins,
        promo_code=payload.promo_code,
    )
