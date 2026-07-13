from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.click import VCoinClickCheckoutRequest
from app.services.click_service import create_vcoin_checkout_order, handle_complete, handle_prepare


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


@router.post("/vcoins/checkout")
def create_vcoin_click_checkout(payload: VCoinClickCheckoutRequest, db: Session = Depends(get_db)):
    return create_vcoin_checkout_order(
        db,
        telegram_id=payload.telegram_id,
        coins=payload.coins,
        promo_code=payload.promo_code,
    )
