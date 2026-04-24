# backend/app/db.py

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def ensure_reading_progress_columns():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS raw_score INTEGER;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS max_score INTEGER;"
        ))

        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS band_score DOUBLE PRECISION;"
        ))

        conn.commit()


def ensure_mock_pack_column():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE reading_tests "
            "ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;"
        ))

        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'reading_tests_mock_pack_id_fkey'"
            ") THEN "
            "ALTER TABLE reading_tests "
            "ADD CONSTRAINT reading_tests_mock_pack_id_fkey "
            "FOREIGN KEY (mock_pack_id) "
            "REFERENCES mock_packs(id) "
            "ON DELETE CASCADE;"
            "END IF; "
            "END "
            "$$;"
        ))

        conn.commit()

def ensure_question_group_column():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE reading_questions "
            "ADD COLUMN IF NOT EXISTS question_group_id INTEGER;"
        ))
        conn.commit()


def ensure_reading_question_type_values():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        enum_exists = conn.execute(text(
            "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'readingquestiontype');"
        )).scalar()

        if not enum_exists:
            return

        conn.execute(text(
            "ALTER TYPE readingquestiontype "
            "ADD VALUE IF NOT EXISTS 'PARAGRAPH_MATCHING';"
        ))


def ensure_writing_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'writingteststatus') THEN "
            "CREATE TYPE writingteststatus AS ENUM ('draft', 'published'); "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS writing_tests ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NOT NULL DEFAULT '', "
            "time_limit_minutes INTEGER NOT NULL DEFAULT 60, "
            "status writingteststatus NOT NULL DEFAULT 'draft', "
            "mock_pack_id INTEGER NULL, "
            "created_at TIMESTAMP NULL, "
            "updated_at TIMESTAMP NULL"
            ");"
        ))

        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS title VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS status writingteststatus;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tests "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"
        ))

        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF EXISTS ("
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'writing_tests' "
            "AND column_name = 'status' "
            "AND udt_name <> 'writingteststatus'"
            ") THEN "
            "ALTER TABLE writing_tests "
            "ALTER COLUMN status TYPE writingteststatus "
            "USING status::writingteststatus; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'writing_tests_mock_pack_id_fkey'"
            ") THEN "
            "ALTER TABLE writing_tests "
            "ADD CONSTRAINT writing_tests_mock_pack_id_fkey "
            "FOREIGN KEY (mock_pack_id) "
            "REFERENCES mock_packs(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS writing_tasks ("
            "id SERIAL PRIMARY KEY, "
            "test_id INTEGER NOT NULL, "
            "task_number INTEGER NOT NULL, "
            "instruction_template TEXT NULL, "
            "question_text TEXT NULL, "
            "image_url VARCHAR NULL, "
            "order_index INTEGER NOT NULL DEFAULT 0"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS test_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS task_number INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS instruction_template TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS question_text TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS image_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_tasks "
            "ADD COLUMN IF NOT EXISTS order_index INTEGER;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'writing_tasks_test_id_fkey'"
            ") THEN "
            "ALTER TABLE writing_tasks "
            "ADD CONSTRAINT writing_tasks_test_id_fkey "
            "FOREIGN KEY (test_id) "
            "REFERENCES writing_tests(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS writing_progress ("
            "id SERIAL PRIMARY KEY, "
            "test_id INTEGER NOT NULL, "
            "telegram_id BIGINT NOT NULL, "
            "task1_text TEXT NULL, "
            "task1_image_url VARCHAR NULL, "
            "task2_text TEXT NULL, "
            "task2_image_url VARCHAR NULL, "
            "started_at TIMESTAMPTZ NULL, "
            "updated_at TIMESTAMPTZ NULL, "
            "submitted_at TIMESTAMPTZ NULL, "
            "is_submitted BOOLEAN NOT NULL DEFAULT FALSE, "
            "finish_type VARCHAR NULL"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS test_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS task1_text TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS task1_image_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS task2_text TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS task2_image_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS finish_type VARCHAR;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'writing_progress_test_id_fkey'"
            ") THEN "
            "ALTER TABLE writing_progress "
            "ADD CONSTRAINT writing_progress_test_id_fkey "
            "FOREIGN KEY (test_id) "
            "REFERENCES writing_tests(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))
