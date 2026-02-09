from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db import engine
from app.models import Base, User
from app.deps import get_db

app = FastAPI(title="Voxi Mini App API")

Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"status": "ok", "service": "voxi-miniapp-backend"}

@app.post("/users")
def create_user(telegram_id: str, name: str, db: Session = Depends(get_db)):
    user = User(telegram_id=telegram_id, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "telegram_id": user.telegram_id, "name": user.name}
