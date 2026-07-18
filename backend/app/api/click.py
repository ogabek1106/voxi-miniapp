from fastapi import APIRouter, Depends, Form, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import ADMIN_IDS, CLICK_TEST_MODE
from app.deps import get_db
from app.models import User
from app.schemas.click import ClickTestSimulateRequest, DonationClickCheckoutRequest, VCoinClickCheckoutRequest
from app.services.auth_service import get_session_user
from app.services.click_service import (
    create_donation_checkout_order,
    create_vcoin_checkout_order,
    handle_complete,
    handle_prepare,
    simulate_click_test_action,
)


router = APIRouter(prefix="/payments/click", tags=["click"])


@router.post("/prepare")
def click_prepare(
    click_trans_id: str = Form(...),
    service_id: str = Form(...),
    click_paydoc_id: str = Form(...),
    merchant_trans_id: str = Form(...),
    amount: str = Form(...),
    action: str = Form(...),
    error: str = Form(...),
    error_note: str = Form(...),
    sign_time: str = Form(...),
    sign_string: str = Form(...),
    db: Session = Depends(get_db),
):
    return handle_prepare(db, locals())


@router.post("/complete")
def click_complete(
    click_trans_id: str = Form(...),
    service_id: str = Form(...),
    click_paydoc_id: str = Form(...),
    merchant_trans_id: str = Form(...),
    merchant_prepare_id: str = Form(...),
    amount: str = Form(...),
    action: str = Form(...),
    error: str = Form(...),
    error_note: str = Form(...),
    sign_time: str = Form(...),
    sign_string: str = Form(...),
    db: Session = Depends(get_db),
):
    return handle_complete(db, locals())


def _resolve_checkout_user(db: Session, request: Request, telegram_id: int | None) -> User:
    session_user = get_session_user(db, request)
    if session_user:
        return session_user
    if telegram_id:
        user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()
        if user:
            return user
    raise HTTPException(status_code=401, detail="authenticated_user_required")


@router.post("/vcoins/checkout")
def create_vcoin_click_checkout(payload: VCoinClickCheckoutRequest, request: Request, db: Session = Depends(get_db)):
    user = _resolve_checkout_user(db, request, payload.telegram_id)
    return create_vcoin_checkout_order(
        db,
        user=user,
        coins=payload.coins,
        promo_code=payload.promo_code,
    )


@router.post("/donations/checkout")
def create_donation_click_checkout(payload: DonationClickCheckoutRequest, request: Request, db: Session = Depends(get_db)):
    user = _resolve_checkout_user(db, request, payload.telegram_id)
    return create_donation_checkout_order(
        db,
        user=user,
        amount_uzs=payload.amount_uzs,
    )


@router.post("/test/simulate")
def simulate_click_test(payload: ClickTestSimulateRequest, db: Session = Depends(get_db)):
    if not CLICK_TEST_MODE:
        raise HTTPException(status_code=404, detail="click_test_mode_disabled")
    if int(payload.telegram_id or 0) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="admin_only")
    return simulate_click_test_action(db, payload.model_dump())
