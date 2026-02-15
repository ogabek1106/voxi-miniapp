#backend/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.db import engine
from app.models import Base, User
from app.deps import get_db
from app.api.mock_tests import router as mock_tests_router
from pydantic import BaseModel
app = FastAPI(title="Voxi Mini App API")
app.include_router(mock_tests_router)

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




