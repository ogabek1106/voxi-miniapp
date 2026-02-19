# backend/app/models.py
from sqlalchemy import Column, Integer, String, BigInteger, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum
from .db import Base


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

    passages = relationship("ReadingPassage", back_populates="test", cascade="all, delete-orphan")


class ReadingPassage(Base):
    __tablename__ = "reading_passages"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("reading_tests.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    text = Column(Text, nullable=False)

    test = relationship("ReadingTest", back_populates="passages")
    questions = relationship("ReadingQuestion", back_populates="passage", cascade="all, delete-orphan")


class ReadingQuestion(Base):
    __tablename__ = "reading_questions"

    id = Column(Integer, primary_key=True, index=True)
    passage_id = Column(Integer, ForeignKey("reading_passages.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False)

    type = Column(String, nullable=False)
    text = Column(Text, nullable=False)

    options = Column(JSON, nullable=True)
    correct_answer = Column(JSON, nullable=True)
    word_limit = Column(Integer, nullable=True)

    passage = relationship("ReadingPassage", back_populates="questions")
