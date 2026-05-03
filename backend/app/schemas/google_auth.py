from pydantic import BaseModel


class GoogleLoginIn(BaseModel):
    id_token: str


class GoogleConfigOut(BaseModel):
    client_id: str
