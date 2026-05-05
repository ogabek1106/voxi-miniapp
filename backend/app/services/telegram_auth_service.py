import hashlib
import hmac
import os
import time

from fastapi import HTTPException


def get_telegram_bot_token() -> str | None:
    token = (
        os.getenv("TELEGRAM_BOT_TOKEN")
        or os.getenv("BOT_TOKEN")
        or os.getenv("TELEGRAM_TOKEN")
        or os.getenv("VOXI_BOT_TOKEN")
    )
    return token.strip() if token else None


def get_telegram_bot_id() -> str:
    bot_token = get_telegram_bot_token()
    if not bot_token or ":" not in bot_token:
        raise HTTPException(status_code=500, detail="telegram_bot_token_not_configured")
    return bot_token.split(":", 1)[0]


def verify_telegram_login(payload: dict) -> dict:
    bot_token = get_telegram_bot_token()
    if not bot_token:
        raise HTTPException(status_code=500, detail="telegram_bot_token_not_configured")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid_telegram_payload")

    required_fields = ("id", "auth_date", "hash")
    missing_fields = [field for field in required_fields if payload.get(field) in (None, "")]
    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"missing_telegram_fields:{','.join(missing_fields)}",
        )

    received_hash = str(payload.get("hash") or "")
    if not received_hash:
        raise HTTPException(status_code=400, detail="missing_telegram_hash")

    try:
        auth_date = int(payload.get("auth_date") or 0)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="invalid_telegram_auth_date") from exc
    if not auth_date or time.time() - auth_date > 86400:
        raise HTTPException(status_code=401, detail="telegram_login_expired")

    data_check_string = "\n".join(
        f"{key}={value}"
        for key, value in sorted(payload.items())
        if key != "hash" and value is not None
    )
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="invalid_telegram_hash")

    return payload
