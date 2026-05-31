import os
from typing import Any, Dict

import requests
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import ADMIN_IDS


router = APIRouter(prefix="/admin/content-engine", tags=["admin-content-engine"])

BOT_API_BASE = "/api/content-engine/v1"
REQUEST_TIMEOUT = (10, 900)


def require_admin(telegram_id: int) -> None:
    if int(telegram_id) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="admin_only")


def _bot_base_url() -> str:
    return os.getenv("BOT_CONTENT_ENGINE_API_BASE", "").strip().rstrip("/")


def _api_key() -> str:
    return os.getenv("CONTENT_ENGINE_API_KEY", "").strip()


def _bot_url(path: str) -> str:
    base = _bot_base_url()
    if not base or not _api_key():
        raise HTTPException(status_code=503, detail="content_engine_api_not_configured")
    clean_path = path if path.startswith("/") else f"/{path}"
    return f"{base}{BOT_API_BASE}{clean_path}"


def _headers() -> Dict[str, str]:
    key = _api_key()
    if not key:
        raise HTTPException(status_code=503, detail="content_engine_api_not_configured")
    return {"Authorization": f"Bearer {key}"}


def _json_or_detail(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return {"ok": False, "error": "bot_api_unavailable"}


def _relay(response: requests.Response) -> Any:
    data = _json_or_detail(response)
    if response.status_code >= 400:
        detail = data if isinstance(data, dict) else {"error": "bot_api_error"}
        raise HTTPException(status_code=response.status_code, detail=detail)
    return data


@router.get("/health")
def content_engine_health(telegram_id: int):
    require_admin(telegram_id)
    try:
        response = requests.get(_bot_url("/health"), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="bot_api_unavailable")
    return _relay(response)


@router.get("/resources")
def list_content_engine_resources(telegram_id: int):
    require_admin(telegram_id)
    try:
        response = requests.get(_bot_url("/resources"), headers=_headers(), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="bot_api_unavailable")
    return _relay(response)


@router.get("/resources/{resource_id}")
def get_content_engine_resource(resource_id: int, telegram_id: int):
    require_admin(telegram_id)
    try:
        response = requests.get(_bot_url(f"/resources/{resource_id}"), headers=_headers(), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="bot_api_unavailable")
    return _relay(response)


@router.post("/resources/{resource_id}/retry")
def retry_content_engine_resource(resource_id: int, telegram_id: int):
    require_admin(telegram_id)
    try:
        response = requests.post(_bot_url(f"/resources/{resource_id}/retry"), headers=_headers(), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="bot_api_unavailable")
    return _relay(response)


@router.post("/resources/upload")
def upload_content_engine_resource(
    telegram_id: int,
    file: UploadFile = File(...),
    title: str = Form(""),
    category: str = Form(""),
    source_type: str = Form("api_upload"),
):
    require_admin(telegram_id)
    file.file.seek(0)
    data = {
        "title": title or "",
        "category": category or "",
        "source_type": source_type or "api_upload",
    }
    files = {
        "file": (
            file.filename or "resource.bin",
            file.file,
            file.content_type or "application/octet-stream",
        )
    }
    try:
        response = requests.post(
            _bot_url("/resources/upload"),
            headers=_headers(),
            data=data,
            files=files,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="bot_api_unavailable")
    return _relay(response)
