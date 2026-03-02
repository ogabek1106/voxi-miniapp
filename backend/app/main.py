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
from app.api.admin import router as admin_router
from app.api.admin_reading import router as admin_reading_router
from .db import ensure_reading_progress_columns, ensure_mock_pack_column
from app.api.admin_upload import router as admin_upload_router
from app.api import admin_mock_packs
import os

os.makedirs("media", exist_ok=True)
ensure_reading_progress_columns()
ensure_mock_pack_column()
app = FastAPI(title="Voxi Mini App API")

app.include_router(admin_upload_router)
app.include_router(admin_reading_router)
app.include_router(mock_tests_router)
app.include_router(me_router)
app.include_router(admin_router)
app.include_router(admin_mock_packs.router)
app.mount("/media", StaticFiles(directory="media"), name="media")
# ✅ CORS FIX (required for Telegram Mini App)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock down later
    allow_credentials=True,
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

from sqlalchemy import text

@app.get("/fix-reading-questions-schema")
def fix_schema(db: Session = Depends(get_db)):
    db.execute(text("""
        ALTER TABLE reading_questions
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS instruction TEXT,
        ADD COLUMN IF NOT EXISTS meta JSON,
        ADD COLUMN IF NOT EXISTS explanation TEXT,
        ADD COLUMN IF NOT EXISTS points INTEGER;
    """))

    db.execute(text("""
        ALTER TABLE reading_passages
        ADD COLUMN IF NOT EXISTS image_url TEXT;
    """))

    db.commit()

    return {"status": "schema updated"}


