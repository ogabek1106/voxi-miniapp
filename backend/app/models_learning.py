from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db import Base


class LearningMonth(Base):
    __tablename__ = "learning_months"

    id = Column(Integer, primary_key=True, index=True)
    month_number = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=True, default="draft", index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    days = relationship("LearningDay", back_populates="month", cascade="all, delete-orphan")


class LearningDay(Base):
    __tablename__ = "learning_days"

    id = Column(Integer, primary_key=True, index=True)
    month_id = Column(Integer, ForeignKey("learning_months.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=True)
    subtitle = Column(Text, nullable=True)
    status = Column(String, nullable=True, default="draft", index=True)
    estimated_minutes = Column(Integer, nullable=True)
    xp_reward = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    month = relationship("LearningMonth", back_populates="days")
    blocks = relationship("LearningDayBlock", back_populates="day", cascade="all, delete-orphan")


class LearningDayBlock(Base):
    __tablename__ = "learning_day_blocks"

    id = Column(Integer, primary_key=True, index=True)
    day_id = Column(Integer, ForeignKey("learning_days.id", ondelete="CASCADE"), nullable=False, index=True)
    block_type = Column(String, nullable=True, index=True)
    sort_order = Column(Integer, nullable=False, default=0)
    content_json = Column(JSON, nullable=True)
    is_required = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    day = relationship("LearningDay", back_populates="blocks")
