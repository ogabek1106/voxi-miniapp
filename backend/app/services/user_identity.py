import secrets
import string

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User

PUBLIC_ID_ALPHABET = string.ascii_uppercase + string.digits


def generate_public_user_id() -> str:
    first = "".join(secrets.choice(PUBLIC_ID_ALPHABET) for _ in range(4))
    second = "".join(secrets.choice(PUBLIC_ID_ALPHABET) for _ in range(4))
    return f"VX-{first}-{second}"


def ensure_public_user_id(db: Session, user: User) -> User:
    if getattr(user, "public_user_id", None):
        return user

    for _ in range(12):
        candidate = generate_public_user_id()
        exists = db.query(User.id).filter(User.public_user_id == candidate).first()
        if exists:
            continue
        user.public_user_id = candidate
        db.add(user)
        db.flush()
        return user

    raise HTTPException(status_code=500, detail="public_user_id_generation_failed")


def resolve_user_by_exam_identity(db: Session, exam_identity: int) -> User:
    identity = int(exam_identity)
    if identity < 0:
        user = db.query(User).filter(User.id == abs(identity)).first()
    else:
        user = db.query(User).filter(User.telegram_id == identity).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ensure_public_user_id(db, user)


def progress_telegram_identity(user: User) -> int:
    if user.telegram_id:
        return int(user.telegram_id)
    return -int(user.id)

