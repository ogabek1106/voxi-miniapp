# backend/app/services/telegram_sub_gate.py
import os
import json
import hmac
import hashlib
import requests
from urllib.parse import parse_qsl

def get_bot_token():
    return os.getenv("BOT_TOKEN")


def get_required_channel():
    return os.getenv("REQUIRED_CHANNEL_ID")


def validate_telegram_init_data(init_data: str):
    data_pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data_pairs.pop("hash", None)

    if not received_hash:
        return None

    bot_token = get_bot_token()
    if not bot_token:
        return None

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(data_pairs.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        return None

    return data_pairs


def extract_telegram_user_id(validated_data):
    if not validated_data:
        return None

    user_raw = validated_data.get("user")
    if not user_raw:
        return None

    try:
        user_data = json.loads(user_raw)
    except (json.JSONDecodeError, TypeError):
        return None

    return user_data.get("id")


def check_channel_membership(telegram_user_id: int):
    bot_token = get_bot_token()
    required_channel = get_required_channel()

    if not bot_token or not required_channel or not telegram_user_id:
        return False

    url = f"https://api.telegram.org/bot{bot_token}/getChatMember"
    params = {
        "chat_id": required_channel,
        "user_id": telegram_user_id,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
    except Exception:
        return False

    if not data.get("ok"):
        return False

    status = data.get("result", {}).get("status")
    return status in {"creator", "administrator", "member", "restricted"}


def check_reading_access(init_data: str):
    validated_data = validate_telegram_init_data(init_data)
    if not validated_data:
        return {"ok": False, "reason": "invalid_init_data"}

    telegram_user_id = extract_telegram_user_id(validated_data)
    if not telegram_user_id:
        return {"ok": False, "reason": "user_not_found"}

    is_member = check_channel_membership(telegram_user_id)
    if not is_member:
        return {"ok": False, "reason": "not_subscribed"}

    return {"ok": True, "telegram_user_id": telegram_user_id}
