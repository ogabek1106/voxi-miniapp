# backend/app/api/result_images.py
from __future__ import annotations

import base64
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/result-images", tags=["result-images"])


class ResultImageUploadIn(BaseModel):
    image_base64: str


@router.post("/upload")
def upload_result_image(payload: ResultImageUploadIn):
    raw = payload.image_base64 or ""

    prefix = "data:image/png;base64,"
    if raw.startswith(prefix):
        raw = raw[len(prefix):]

    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image")

    uploads_dir = Path("static/result_images")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.png"
    file_path = uploads_dir / filename
    file_path.write_bytes(image_bytes)

    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    if not public_base:
        raise HTTPException(status_code=500, detail="PUBLIC_BASE_URL is not configured")

    return {
        "url": f"{public_base}/static/result_images/{filename}",
        "file_name": filename
    }
