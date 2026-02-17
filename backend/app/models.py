# backend/app/models.py
from sqlalchemy import Column, Integer, String, BigInteger
from .db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)      # allow empty
    surname = Column(String, nullable=True)   # NEW
