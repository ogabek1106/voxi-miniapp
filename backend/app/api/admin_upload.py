# backend/app/api/admin_upload.py
from fastapi import APIRouter, UploadFile, File
from uuid import uuid4
import os

router = APIRouter(prefix="/admin", tags=["admin-upload"])

UPLOAD_DIR = "/data/media"

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"url": f"/media/{filename}"}


@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"url": f"/media/{filename}"}
