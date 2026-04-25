#backend/app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db import engine
from app.models import Base, User
from app.deps import get_db
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.api.mock_tests import router as mock_tests_router
from app.api.me import router as me_router
from app.api import mock_list
from app.api.admin import router as admin_router
from app.api.admin_reading_stats import router as admin_reading_stats_router
from app.api.admin_reading import router as admin_reading_router
from app.api.admin_listening import router as admin_listening_router
from app.api.admin_writing import router as admin_writing_router
from app.api.writing import router as writing_router
from app.api.speaking import router as speaking_router
from .db import (
    ensure_reading_progress_columns,
    ensure_mock_pack_column,
    ensure_question_group_column,
    ensure_reading_question_type_values,
    ensure_writing_schema,
    ensure_speaking_schema
)
from app.api.admin_upload import router as admin_upload_router
from app.api.result_images import router as result_images_router
from app.api import admin_mock_packs
import os

os.makedirs("media", exist_ok=True)
os.makedirs("static/result_images", exist_ok=True)
ensure_reading_progress_columns()
ensure_mock_pack_column()
ensure_question_group_column()
ensure_reading_question_type_values()
ensure_writing_schema()
ensure_speaking_schema()
app = FastAPI(title="Voxi Mini App API")
app.include_router(mock_list.router)
app.include_router(admin_upload_router)
app.include_router(admin_reading_router)
app.include_router(admin_listening_router)
app.include_router(admin_writing_router)
app.include_router(mock_tests_router)
app.include_router(writing_router)
app.include_router(speaking_router)
app.include_router(me_router)
app.include_router(admin_router)
app.include_router(admin_reading_stats_router)
app.include_router(admin_mock_packs.router)
app.include_router(result_images_router)
app.mount("/media", StaticFiles(directory="/data/media"), name="media")
app.mount("/static", StaticFiles(directory="static"), name="static")
# ✅ CORS FIX (required for Telegram Mini App)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cooperative-endurance-production.up.railway.app",
        "https://voxi-miniapp-production.up.railway.app",
        "https://web.telegram.org",
        "https://web.telegram.org/a"
    ],
    allow_origin_regex=r"https://.*\.railway\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"status": "ok", "service": "voxi-miniapp-backend"}

class CreateUserIn(BaseModel):
    telegram_id: int
    name: str


@app.post("/users")
def create_or_update_user(payload: CreateUserIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()

    if user:
        user.name = payload.name
        db.commit()
        db.refresh(user)
        return {
            "status": "updated",
            "message": "Your name updated!",
            "id": user.id,
            "telegram_id": user.telegram_id,
            "name": user.name,
        }

    user = User(telegram_id=payload.telegram_id, name=payload.name)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "created",
        "message": "Your name saved!",
        "id": user.id,
        "telegram_id": user.telegram_id,
        "name": user.name,
    }
