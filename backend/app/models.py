# backend/app/models.py
from sqlalchemy import Column, Integer, String, BigInteger, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum
from .db import Base
from sqlalchemy import DateTime
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    surname = Column(String, nullable=True)


class ReadingTestStatus(enum.Enum):
    draft = "draft"
    published = "published"


class ReadingTest(Base):
    __tablename__ = "reading_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    time_limit_minutes = Column(Integer, default=60)
    status = Column(Enum(ReadingTestStatus), default=ReadingTestStatus.draft)

    mock_pack_id = Column(
        Integer,
        ForeignKey("mock_packs.id", ondelete="CASCADE"),
        nullable=True
    )

    passages = relationship(
        "ReadingPassage",
        back_populates="test",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

class ReadingPassage(Base):
    __tablename__ = "reading_passages"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("reading_tests.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    test = relationship("ReadingTest", back_populates="passages")
    questions = relationship(
        "ReadingQuestion",
        back_populates="passage",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
class ReadingQuestionType(enum.Enum):
    TFNG = "TFNG"
    YES_NO_NG = "YES_NO_NG"
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTI_CHOICE = "MULTI_CHOICE"
    MATCHING = "MATCHING"
    TEXT_INPUT = "TEXT_INPUT"

class ReadingQuestion(Base):
    __tablename__ = "reading_questions"

    id = Column(Integer, primary_key=True, index=True)
    passage_id = Column(Integer, ForeignKey("reading_passages.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False)

    type = Column(Enum(ReadingQuestionType), nullable=False)
    correct_answer = Column(JSON, nullable=True)
    instruction = Column(Text, nullable=True)
    content = Column(JSON, nullable=False)
    meta = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=1)
    image_url = Column(String, nullable=True)
    passage = relationship("ReadingPassage", back_populates="questions")
    

class ReadingProgress(Base):
    __tablename__ = "reading_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    test_id = Column(Integer, ForeignKey("reading_tests.id", ondelete="CASCADE"))

    answers = Column(JSON, nullable=False, default=dict)
    started_at = Column(DateTime(timezone=True), nullable=True)   # ⏱ when test started
    ends_at = Column(DateTime(timezone=True), nullable=True)      # ⏱ absolute end time
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MockPackStatus(enum.Enum):
    draft = "draft"
    published = "published"


class MockPack(Base):
    __tablename__ = "mock_packs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    status = Column(Enum(MockPackStatus), default=MockPackStatus.draft)
    created_at = Column(DateTime, default=datetime.utcnow)

    readings = relationship(
        "ReadingTest",
        backref="mock_pack",
        cascade="all, delete-orphan"
    )
