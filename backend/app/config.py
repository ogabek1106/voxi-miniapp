# backend/app/config.py
import os


def _env_bool(name: str, default: bool = False) -> bool:
    fallback = "true" if default else "false"
    return os.getenv(name, fallback).strip().lower() in {"1", "true", "yes", "on"}


ADMIN_IDS = {
    1150875355,
    # 6013730248,
    # 7852340898,
    # 6637084591,
}

VCOIN_ENABLED = _env_bool("VCOIN_ENABLED", False)
UZS_PAYMENTS_ENABLED = _env_bool("UZS_PAYMENTS_ENABLED", True)

PAYME_MERCHANT_ID = os.getenv("PAYME_MERCHANT_ID", "").strip()
PAYME_SECRET_KEY = os.getenv("PAYME_SECRET_KEY", "").strip()
PAYME_CHECKOUT_BASE_URL = os.getenv("PAYME_CHECKOUT_BASE_URL", "https://checkout.paycom.uz").strip()
PAYME_RETURN_URL = os.getenv("PAYME_RETURN_URL", "").strip()
PAYME_TEST_MODE = _env_bool("PAYME_TEST_MODE", False)

CLICK_MERCHANT_ID = os.getenv("CLICK_MERCHANT_ID", "").strip()
CLICK_SERVICE_ID = os.getenv("CLICK_SERVICE_ID", "").strip()
CLICK_SECRET_KEY = os.getenv("CLICK_SECRET_KEY", "").strip()
CLICK_MERCHANT_USER_ID = os.getenv("CLICK_MERCHANT_USER_ID", "").strip()
CLICK_CHECKOUT_BASE_URL = os.getenv("CLICK_CHECKOUT_BASE_URL", "https://my.click.uz/services/pay/").strip()
CLICK_RETURN_URL = os.getenv("CLICK_RETURN_URL", "").strip()
CLICK_TEST_MODE = _env_bool("CLICK_TEST_MODE", False)
CLICK_TEST_MERCHANT_ID = os.getenv("CLICK_TEST_MERCHANT_ID", "test_merchant").strip()
CLICK_TEST_SERVICE_ID = os.getenv("CLICK_TEST_SERVICE_ID", "106870").strip()
CLICK_TEST_SECRET_KEY = os.getenv("CLICK_TEST_SECRET_KEY", "test_secret").strip()
