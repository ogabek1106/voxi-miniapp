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
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_overall_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_task1_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_task2_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_task1_result JSON;"
        ))
        conn.execute(text(
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS ai_task2_result JSON;"
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


def ensure_speaking_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'speakingteststatus') THEN "
            "CREATE TYPE speakingteststatus AS ENUM ('draft', 'published'); "
            "END IF; "
            "END "
            "$$;"
        ))


def ensure_listening_instruction_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "ALTER TABLE listening_tests "
            "ADD COLUMN IF NOT EXISTS global_instruction_intro TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_tests "
            "ADD COLUMN IF NOT EXISTS global_instruction_intro_audio_url TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_tests "
            "ADD COLUMN IF NOT EXISTS global_instruction_intro_audio_name TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_sections "
            "ADD COLUMN IF NOT EXISTS audio_url TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_sections "
            "ADD COLUMN IF NOT EXISTS audio_name TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_sections "
            "ADD COLUMN IF NOT EXISTS global_instruction_after TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_sections "
            "ADD COLUMN IF NOT EXISTS global_instruction_after_audio_url TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE listening_sections "
            "ADD COLUMN IF NOT EXISTS global_instruction_after_audio_name TEXT;"
        ))


def ensure_full_mock_results_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS full_mock_results ("
            "id SERIAL PRIMARY KEY, "
            "mock_pack_id INTEGER NOT NULL, "
            "telegram_id BIGINT NOT NULL, "
            "listening_band DOUBLE PRECISION NULL, "
            "reading_band DOUBLE PRECISION NULL, "
            "writing_band DOUBLE PRECISION NULL, "
            "speaking_band DOUBLE PRECISION NULL, "
            "raw_average_band DOUBLE PRECISION NULL, "
            "overall_band DOUBLE PRECISION NULL, "
            "completed_at TIMESTAMPTZ NULL, "
            "status VARCHAR NOT NULL DEFAULT 'pending', "
            "updated_at TIMESTAMPTZ NULL"
            ");"
        ))

        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS listening_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS reading_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS writing_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS speaking_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS raw_average_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS overall_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS status VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE full_mock_results "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;"
        ))

        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_full_mock_results_pack_user "
            "ON full_mock_results (mock_pack_id, telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_full_mock_results_mock_pack_id "
            "ON full_mock_results (mock_pack_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_full_mock_results_telegram_id "
            "ON full_mock_results (telegram_id);"
        ))

        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'full_mock_results_mock_pack_id_fkey'"
            ") THEN "
            "ALTER TABLE full_mock_results "
            "ADD CONSTRAINT full_mock_results_mock_pack_id_fkey "
            "FOREIGN KEY (mock_pack_id) "
            "REFERENCES mock_packs(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS speaking_tests ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NOT NULL DEFAULT '', "
            "time_limit_minutes INTEGER NOT NULL DEFAULT 18, "
            "status speakingteststatus NOT NULL DEFAULT 'draft', "
            "mock_pack_id INTEGER NULL, "
            "created_at TIMESTAMP NULL, "
            "updated_at TIMESTAMP NULL"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS title VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS status speakingteststatus;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_tests "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'speaking_tests_mock_pack_id_fkey'"
            ") THEN "
            "ALTER TABLE speaking_tests "
            "ADD CONSTRAINT speaking_tests_mock_pack_id_fkey "
            "FOREIGN KEY (mock_pack_id) "
            "REFERENCES mock_packs(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS speaking_parts ("
            "id SERIAL PRIMARY KEY, "
            "test_id INTEGER NOT NULL, "
            "part_number INTEGER NOT NULL, "
            "instruction TEXT NULL, "
            "question TEXT NULL, "
            "order_index INTEGER NOT NULL DEFAULT 0"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_parts "
            "ADD COLUMN IF NOT EXISTS test_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_parts "
            "ADD COLUMN IF NOT EXISTS part_number INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_parts "
            "ADD COLUMN IF NOT EXISTS instruction TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_parts "
            "ADD COLUMN IF NOT EXISTS question TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_parts "
            "ADD COLUMN IF NOT EXISTS order_index INTEGER;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'speaking_parts_test_id_fkey'"
            ") THEN "
            "ALTER TABLE speaking_parts "
            "ADD CONSTRAINT speaking_parts_test_id_fkey "
            "FOREIGN KEY (test_id) "
            "REFERENCES speaking_tests(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS speaking_progress ("
            "id SERIAL PRIMARY KEY, "
            "test_id INTEGER NOT NULL, "
            "telegram_id BIGINT NOT NULL, "
            "part1_audio_url VARCHAR NULL, "
            "part2_audio_url VARCHAR NULL, "
            "part3_audio_url VARCHAR NULL, "
            "started_at TIMESTAMPTZ NULL, "
            "submitted_at TIMESTAMPTZ NULL, "
            "is_submitted BOOLEAN NOT NULL DEFAULT FALSE"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS test_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS part1_audio_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS part2_audio_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS part3_audio_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'speaking_progress_test_id_fkey'"
            ") THEN "
            "ALTER TABLE speaking_progress "
            "ADD CONSTRAINT speaking_progress_test_id_fkey "
            "FOREIGN KEY (test_id) "
            "REFERENCES speaking_tests(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS speaking_results ("
            "id SERIAL PRIMARY KEY, "
            "progress_id INTEGER NOT NULL UNIQUE, "
            "overall_band DOUBLE PRECISION NOT NULL, "
            "fluency_band DOUBLE PRECISION NOT NULL, "
            "lexical_band DOUBLE PRECISION NOT NULL, "
            "grammar_band DOUBLE PRECISION NOT NULL, "
            "pronunciation_band DOUBLE PRECISION NOT NULL, "
            "raw_json JSON NOT NULL, "
            "created_at TIMESTAMP NULL"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS progress_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS overall_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS fluency_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS lexical_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS grammar_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS pronunciation_band DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS raw_json JSON;"
        ))
        conn.execute(text(
            "ALTER TABLE speaking_results "
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'speaking_results_progress_id_fkey'"
            ") THEN "
            "ALTER TABLE speaking_results "
            "ADD CONSTRAINT speaking_results_progress_id_fkey "
            "FOREIGN KEY (progress_id) "
            "REFERENCES speaking_progress(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))


def ensure_vcoin_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS v_coins INTEGER NOT NULL DEFAULT 0;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS payment_requests ("
            "id SERIAL PRIMARY KEY, "
            "telegram_id BIGINT NOT NULL, "
            "package_code VARCHAR NULL, "
            "expected_price VARCHAR NULL, "
            "coins_to_add INTEGER NOT NULL, "
            "receipt_file_id TEXT NULL, "
            "receipt_image_hash VARCHAR NULL, "
            "status VARCHAR NOT NULL DEFAULT 'pending', "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "confirmed_at TIMESTAMPTZ NULL, "
            "rejected_at TIMESTAMPTZ NULL, "
            "admin_id BIGINT NULL, "
            "reject_reason TEXT NULL, "
            "raw_payload JSON NULL"
            ");"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_telegram_id "
            "ON payment_requests (telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_receipt_image_hash "
            "ON payment_requests (receipt_image_hash);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_status "
            "ON payment_requests (status);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS coin_ledger ("
            "id SERIAL PRIMARY KEY, "
            "telegram_id BIGINT NOT NULL, "
            "delta INTEGER NOT NULL, "
            "reason VARCHAR NOT NULL, "
            "reference_type VARCHAR NULL, "
            "reference_id VARCHAR NULL, "
            "balance_after INTEGER NOT NULL, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_coin_ledger_telegram_id "
            "ON coin_ledger (telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_coin_ledger_reason "
            "ON coin_ledger (reason);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_coin_ledger_reference_id "
            "ON coin_ledger (reference_id);"
        ))


def ensure_announcement_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_announcements ("
            "id SERIAL PRIMARY KEY, "
            "text TEXT NULL, "
            "image_url VARCHAR NULL, "
            "updated_at TIMESTAMPTZ NULL"
            ");"
        ))

        conn.execute(text(
            "ALTER TABLE app_announcements "
            "ADD COLUMN IF NOT EXISTS text TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE app_announcements "
            "ADD COLUMN IF NOT EXISTS image_url VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE app_announcements "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;"
        ))
