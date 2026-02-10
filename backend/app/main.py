#backend/app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db import engine
from app.models import Base, User
from app.deps import get_db
from pydantic import BaseModel
app = FastAPI(title="Voxi Mini App API")

Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"status": "ok", "service": "voxi-miniapp-backend"}

class CreateUserIn(BaseModel):
    telegram_id: str
    name: str


@app.post("/users")
def create_user(payload: CreateUserIn, db: Session = Depends(get_db)):
    user = User(telegram_id=payload.telegram_id, name=payload.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "telegram_id": user.telegram_id, "name": user.name}
