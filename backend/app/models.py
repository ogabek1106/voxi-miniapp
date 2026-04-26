# backend/app/models.py
from sqlalchemy import Column, Integer, String, BigInteger, Text, ForeignKey, JSON, Enum, Boolean, Float
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
    v_coins = Column(Integer, nullable=False, default=0)


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
    PARAGRAPH_MATCHING = "PARAGRAPH_MATCHING"
    TEXT_INPUT = "TEXT_INPUT"

class ReadingQuestion(Base):
    __tablename__ = "reading_questions"

    id = Column(Integer, primary_key=True, index=True)
    passage_id = Column(Integer, ForeignKey("reading_passages.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False)
    question_group_id = Column(Integer, nullable=True)
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
    is_submitted = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    raw_score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    band_score = Column(Float, nullable=True)
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
    writings = relationship(
        "WritingTest",
        backref="mock_pack",
        cascade="all, delete-orphan"
    )
    speakings = relationship(
        "SpeakingTest",
        backref="mock_pack",
        cascade="all, delete-orphan"
    )


class ListeningTest(Base):
    __tablename__ = "listening_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    audio_url = Column(Text, nullable=True)
    time_limit_minutes = Column(Integer, default=60, nullable=False)
    status = Column(String, default="draft", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    sections = relationship(
        "ListeningSection",
        back_populates="test",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class ListeningSection(Base):
    __tablename__ = "listening_sections"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("listening_tests.id", ondelete="CASCADE"), nullable=False)
    section_number = Column(Integer, nullable=False)
    instructions = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)

    test = relationship("ListeningTest", back_populates="sections")
    blocks = relationship(
        "ListeningBlock",
        back_populates="section",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class ListeningBlock(Base):
    __tablename__ = "listening_blocks"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("listening_sections.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    block_type = Column(String, nullable=False)
    title = Column(String, nullable=True)
    instruction = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    start_time_seconds = Column(Integer, nullable=True)
    end_time_seconds = Column(Integer, nullable=True)
    meta = Column(JSON, nullable=True)

    section = relationship("ListeningSection", back_populates="blocks")
    questions = relationship(
        "ListeningQuestion",
        back_populates="block",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class ListeningQuestion(Base):
    __tablename__ = "listening_questions"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("listening_blocks.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    question_number = Column(Integer, nullable=False)
    type = Column(String, nullable=True)
    content = Column(JSON, nullable=True)
    correct_answer = Column(JSON, nullable=True)
    meta = Column(JSON, nullable=True)

    block = relationship("ListeningBlock", back_populates="questions")


class WritingTestStatus(enum.Enum):
    draft = "draft"
    published = "published"


class WritingTest(Base):
    __tablename__ = "writing_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    time_limit_minutes = Column(Integer, default=60, nullable=False)
    status = Column(Enum(WritingTestStatus), default=WritingTestStatus.draft, nullable=False)
    mock_pack_id = Column(Integer, ForeignKey("mock_packs.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    tasks = relationship(
        "WritingTask",
        back_populates="test",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class WritingTask(Base):
    __tablename__ = "writing_tasks"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("writing_tests.id", ondelete="CASCADE"), nullable=False)
    task_number = Column(Integer, nullable=False)  # 1 or 2
    instruction_template = Column(Text, nullable=True)
    question_text = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)

    test = relationship("WritingTest", back_populates="tasks")


class WritingProgress(Base):
    __tablename__ = "writing_progress"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("writing_tests.id", ondelete="CASCADE"), nullable=False)
    telegram_id = Column(BigInteger, index=True, nullable=False)
    task1_text = Column(Text, nullable=True)
    task1_image_url = Column(String, nullable=True)
    task2_text = Column(Text, nullable=True)
    task2_image_url = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    is_submitted = Column(Boolean, nullable=False, default=False)
    finish_type = Column(String, nullable=True)  # manual / auto
    ai_checked_at = Column(DateTime(timezone=True), nullable=True)
    ai_overall_band = Column(Float, nullable=True)
    ai_task1_band = Column(Float, nullable=True)
    ai_task2_band = Column(Float, nullable=True)
    ai_task1_result = Column(JSON, nullable=True)
    ai_task2_result = Column(JSON, nullable=True)


class SpeakingTestStatus(enum.Enum):
    draft = "draft"
    published = "published"


class SpeakingTest(Base):
    __tablename__ = "speaking_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    time_limit_minutes = Column(Integer, default=18, nullable=False)
    status = Column(Enum(SpeakingTestStatus), default=SpeakingTestStatus.draft, nullable=False)
    mock_pack_id = Column(Integer, ForeignKey("mock_packs.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    parts = relationship(
        "SpeakingPart",
        back_populates="test",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class SpeakingPart(Base):
    __tablename__ = "speaking_parts"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("speaking_tests.id", ondelete="CASCADE"), nullable=False)
    part_number = Column(Integer, nullable=False)
    instruction = Column(Text, nullable=True)
    question = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)

    test = relationship("SpeakingTest", back_populates="parts")


class SpeakingProgress(Base):
    __tablename__ = "speaking_progress"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("speaking_tests.id", ondelete="CASCADE"), nullable=False)
    telegram_id = Column(BigInteger, index=True, nullable=False)
    part1_audio_url = Column(String, nullable=True)
    part2_audio_url = Column(String, nullable=True)
    part3_audio_url = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    is_submitted = Column(Boolean, nullable=False, default=False)


class SpeakingResult(Base):
    __tablename__ = "speaking_results"

    id = Column(Integer, primary_key=True, index=True)
    progress_id = Column(Integer, ForeignKey("speaking_progress.id", ondelete="CASCADE"), nullable=False, unique=True)
    overall_band = Column(Float, nullable=False)
    fluency_band = Column(Float, nullable=False)
    lexical_band = Column(Float, nullable=False)
    grammar_band = Column(Float, nullable=False)
    pronunciation_band = Column(Float, nullable=False)
    raw_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)


class FullMockResult(Base):
    __tablename__ = "full_mock_results"

    id = Column(Integer, primary_key=True, index=True)
    mock_pack_id = Column(Integer, ForeignKey("mock_packs.id", ondelete="CASCADE"), nullable=False, index=True)
    telegram_id = Column(BigInteger, nullable=False, index=True)
    listening_band = Column(Float, nullable=True)
    reading_band = Column(Float, nullable=True)
    writing_band = Column(Float, nullable=True)
    speaking_band = Column(Float, nullable=True)
    raw_average_band = Column(Float, nullable=True)
    overall_band = Column(Float, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="pending")
    updated_at = Column(DateTime(timezone=True), nullable=True)
