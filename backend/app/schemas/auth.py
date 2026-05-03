from pydantic import BaseModel


class EmailSignupIn(BaseModel):
    name: str
    surname: str | None = None
    email: str
    password: str


class EmailLoginIn(BaseModel):
    email: str
    password: str


class TelegramLoginIn(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class ProfileUpdateIn(BaseModel):
    name: str | None = None
    surname: str | None = None


class SafeUserOut(BaseModel):
    id: int
    telegram_id: int | None = None
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    photo_url: str | None = None
    v_coins: int = 0
    is_admin: bool = False
    last_activity: object | None = None


class AuthResponse(BaseModel):
    ok: bool
    user: SafeUserOut
