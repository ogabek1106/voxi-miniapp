from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS, PAYME_TEST_MODE
from app.deps import get_db
from app.schemas.payme import PaymeTestSimulateRequest, VCoinPaymeCheckoutRequest
from app.services.payme_service import (
    access_denied_error,
    check_basic_auth,
    create_vcoin_checkout_order,
    dispatch_payme_method,
    jsonrpc_error,
    simulate_payme_test_action,
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


@router.post("/test/simulate")
def simulate_payme_test(payload: PaymeTestSimulateRequest, db: Session = Depends(get_db)):
    if not PAYME_TEST_MODE:
        raise HTTPException(status_code=404, detail="payme_test_mode_disabled")
    if int(payload.telegram_id or 0) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="admin_only")
    return simulate_payme_test_action(db, payload.model_dump())
