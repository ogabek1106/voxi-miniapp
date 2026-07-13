# backend/app/config.py
import os


ADMIN_IDS = {
    1150875355,
    # 6013730248,
    # 7852340898,
    # 6637084591,
}

PAYME_MERCHANT_ID = os.getenv("PAYME_MERCHANT_ID", "").strip()
PAYME_SECRET_KEY = os.getenv("PAYME_SECRET_KEY", "").strip()
PAYME_CHECKOUT_BASE_URL = os.getenv("PAYME_CHECKOUT_BASE_URL", "https://checkout.paycom.uz").strip()
PAYME_RETURN_URL = os.getenv("PAYME_RETURN_URL", "").strip()
PAYME_TEST_MODE = os.getenv("PAYME_TEST_MODE", "false").strip().lower() in {"1", "true", "yes", "on"}

CLICK_MERCHANT_ID = os.getenv("CLICK_MERCHANT_ID", "").strip()
CLICK_SERVICE_ID = os.getenv("CLICK_SERVICE_ID", "").strip()
CLICK_SECRET_KEY = os.getenv("CLICK_SECRET_KEY", "").strip()
CLICK_CHECKOUT_BASE_URL = os.getenv("CLICK_CHECKOUT_BASE_URL", "https://my.click.uz/services/pay/").strip()
CLICK_RETURN_URL = os.getenv("CLICK_RETURN_URL", "").strip()
