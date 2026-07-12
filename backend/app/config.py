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
