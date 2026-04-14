# backend/app/services/telegram_sub_gate.py
import os
import json
import hmac
import hashlib
from urllib.parse import parse_qsl

def get_bot_token():
    return os.getenv("BOT_TOKEN")


def get_required_channel():
    return os.getenv("REQUIRED_CHANNEL_ID")


def validate_telegram_init_data(init_data: str):
    pass


def extract_telegram_user_id(validated_data):
    pass


def check_channel_membership(telegram_user_id: int):
    pass


def check_reading_access(init_data: str):
    pass
