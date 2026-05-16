from pydantic import BaseModel
from typing import Optional


class NotificationIn(BaseModel):
    admin_id: int
    title: str
    message: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    link_type: Optional[str] = "none"


class NotificationReadIn(BaseModel):
    telegram_id: Optional[int] = None
