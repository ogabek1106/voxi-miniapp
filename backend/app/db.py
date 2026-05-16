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
        conn.execute(text(
            "ALTER TABLE reading_progress "
            "ADD COLUMN IF NOT EXISTS session_mode VARCHAR NOT NULL DEFAULT 'single_block';"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_reading_progress_mode "
            "ON reading_progress (user_id, test_id, session_mode, id);"
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
            "ALTER TABLE writing_progress "
            "ADD COLUMN IF NOT EXISTS session_mode VARCHAR NOT NULL DEFAULT 'single_block';"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_writing_progress_mode "
            "ON writing_progress (telegram_id, test_id, session_mode, id);"
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
            "ALTER TABLE speaking_progress "
            "ADD COLUMN IF NOT EXISTS session_mode VARCHAR NOT NULL DEFAULT 'single_block';"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_speaking_progress_mode "
            "ON speaking_progress (telegram_id, test_id, session_mode, id);"
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


def ensure_user_auth_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "ALTER TABLE users "
            "ALTER COLUMN telegram_id DROP NOT NULL;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS email VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS google_id VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS password_hash TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS photo_url TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;"
        ))
        conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_unique "
            "ON users (email) WHERE email IS NOT NULL;"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id_unique "
            "ON users (google_id) WHERE google_id IS NOT NULL;"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_id_unique "
            "ON users (telegram_id) WHERE telegram_id IS NOT NULL;"
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


def ensure_notification_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_notifications ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NOT NULL, "
            "message TEXT NOT NULL, "
            "image_url VARCHAR NULL, "
            "link_url VARCHAR NULL, "
            "link_type VARCHAR NOT NULL DEFAULT 'none', "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS category VARCHAR NOT NULL DEFAULT 'custom_manual_notification';"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS title VARCHAR;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS message TEXT;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS image_url VARCHAR;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS link_url VARCHAR;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS link_type VARCHAR NOT NULL DEFAULT 'none';"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS schedule_mode VARCHAR NOT NULL DEFAULT 'now';"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS repeat_interval_hours INTEGER NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMPTZ NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS max_send_count INTEGER NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS source_template_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notifications_created_at "
            "ON app_notifications (created_at DESC);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notifications_category "
            "ON app_notifications (category);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notifications_schedule_due "
            "ON app_notifications (is_template, is_enabled, next_send_at);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notifications_source_template_id "
            "ON app_notifications (source_template_id);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_notification_reads ("
            "id SERIAL PRIMARY KEY, "
            "notification_id INTEGER NOT NULL, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE app_notification_reads ADD COLUMN IF NOT EXISTS notification_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_notification_reads ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_notification_reads ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE app_notification_reads ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_reads_notification_id "
            "ON app_notification_reads (notification_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_reads_user_id "
            "ON app_notification_reads (user_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_reads_telegram_id "
            "ON app_notification_reads (telegram_id);"
        ))


def ensure_shadow_writing_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS shadow_writing_essays ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NULL, "
            "level VARCHAR NOT NULL, "
            "theme VARCHAR NOT NULL, "
            "text TEXT NOT NULL, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_shadow_writing_essays_created_at "
            "ON shadow_writing_essays (created_at);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS shadow_writing_attempts ("
            "id SERIAL PRIMARY KEY, "
            "telegram_id BIGINT NOT NULL, "
            "essay_id INTEGER NOT NULL, "
            "started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "completed_at TIMESTAMPTZ NULL, "
            "time_seconds INTEGER NULL, "
            "accuracy DOUBLE PRECISION NULL, "
            "mistakes_count INTEGER NULL, "
            "typed_chars INTEGER NULL"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS essay_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS time_seconds INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS mistakes_count INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE shadow_writing_attempts "
            "ADD COLUMN IF NOT EXISTS typed_chars INTEGER;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'shadow_writing_attempts_essay_id_fkey'"
            ") THEN "
            "ALTER TABLE shadow_writing_attempts "
            "ADD CONSTRAINT shadow_writing_attempts_essay_id_fkey "
            "FOREIGN KEY (essay_id) "
            "REFERENCES shadow_writing_essays(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_shadow_writing_attempts_telegram_id "
            "ON shadow_writing_attempts (telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_shadow_writing_attempts_essay_id "
            "ON shadow_writing_attempts (essay_id);"
        ))


def ensure_vocabulary_puzzle_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS vocabulary_puzzle_sets ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NULL, "
            "level VARCHAR NULL, "
            "category VARCHAR NULL, "
            "explanation TEXT NULL, "
            "status VARCHAR NOT NULL DEFAULT 'draft', "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS title VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS level VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS category VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS explanation TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'draft';"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_sets "
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS vocabulary_puzzle_words ("
            "id SERIAL PRIMARY KEY, "
            "set_id INTEGER NOT NULL, "
            "word_text VARCHAR NOT NULL, "
            "image_url TEXT NULL, "
            "order_index INTEGER NOT NULL DEFAULT 0, "
            "is_correct BOOLEAN NOT NULL DEFAULT FALSE"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD COLUMN IF NOT EXISTS set_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD COLUMN IF NOT EXISTS word_text VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD COLUMN IF NOT EXISTS image_url TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT FALSE;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'vocabulary_puzzle_words_set_id_fkey'"
            ") THEN "
            "ALTER TABLE vocabulary_puzzle_words "
            "ADD CONSTRAINT vocabulary_puzzle_words_set_id_fkey "
            "FOREIGN KEY (set_id) "
            "REFERENCES vocabulary_puzzle_sets(id) "
            "ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_vocabulary_puzzle_sets_status "
            "ON vocabulary_puzzle_sets (status);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_vocabulary_puzzle_words_set_id "
            "ON vocabulary_puzzle_words (set_id);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS vocabulary_odd_one_out_attempts ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "total_sets_played INTEGER NOT NULL DEFAULT 0, "
            "correct_answers INTEGER NOT NULL DEFAULT 0, "
            "wrong_answers INTEGER NOT NULL DEFAULT 0, "
            "timeouts INTEGER NOT NULL DEFAULT 0, "
            "best_streak INTEGER NOT NULL DEFAULT 0, "
            "average_answer_time DOUBLE PRECISION NULL, "
            "total_time_seconds INTEGER NOT NULL DEFAULT 0, "
            "completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS user_id INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS total_sets_played INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS correct_answers INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS wrong_answers INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS timeouts INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS average_answer_time DOUBLE PRECISION;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER NOT NULL DEFAULT 0;"
        ))
        conn.execute(text(
            "ALTER TABLE vocabulary_odd_one_out_attempts "
            "ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_vocab_ooo_attempts_telegram_id "
            "ON vocabulary_odd_one_out_attempts (telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_vocab_ooo_attempts_completed_at "
            "ON vocabulary_odd_one_out_attempts (completed_at);"
        ))


def ensure_word_merge_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_merge_families ("
            "id SERIAL PRIMARY KEY, "
            "title VARCHAR NOT NULL, "
            "cefr_level VARCHAR NULL, "
            "category VARCHAR NULL, "
            "status VARCHAR NOT NULL DEFAULT 'inactive', "
            "mastery_target INTEGER NOT NULL DEFAULT 128, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS title VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS cefr_level VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS category VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'inactive';"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS mastery_target INTEGER NOT NULL DEFAULT 128;"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE word_merge_families ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_merge_stages ("
            "id SERIAL PRIMARY KEY, "
            "family_id INTEGER NOT NULL, "
            "english_word VARCHAR NOT NULL, "
            "uzbek_meaning VARCHAR NOT NULL, "
            "order_index INTEGER NOT NULL DEFAULT 0"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_merge_stages ADD COLUMN IF NOT EXISTS family_id INTEGER;"))
        conn.execute(text("ALTER TABLE word_merge_stages ADD COLUMN IF NOT EXISTS english_word VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_stages ADD COLUMN IF NOT EXISTS uzbek_meaning VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_stages ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'word_merge_stages_family_id_fkey'"
            ") THEN "
            "ALTER TABLE word_merge_stages "
            "ADD CONSTRAINT word_merge_stages_family_id_fkey "
            "FOREIGN KEY (family_id) REFERENCES word_merge_families(id) ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_merge_sessions ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "score INTEGER NOT NULL DEFAULT 0, "
            "mastered_count INTEGER NOT NULL DEFAULT 0, "
            "moves_count INTEGER NOT NULL DEFAULT 0, "
            "status VARCHAR NOT NULL DEFAULT 'started', "
            "board_state JSON NULL, "
            "started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "finished_at TIMESTAMPTZ NULL"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS mastered_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS moves_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'started';"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS board_state JSON;"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE word_merge_sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_merge_moves ("
            "id SERIAL PRIMARY KEY, "
            "session_id INTEGER NOT NULL, "
            "direction VARCHAR NOT NULL, "
            "score_after INTEGER NOT NULL DEFAULT 0, "
            "mastered_after INTEGER NOT NULL DEFAULT 0, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_merge_moves ADD COLUMN IF NOT EXISTS session_id INTEGER;"))
        conn.execute(text("ALTER TABLE word_merge_moves ADD COLUMN IF NOT EXISTS direction VARCHAR;"))
        conn.execute(text("ALTER TABLE word_merge_moves ADD COLUMN IF NOT EXISTS score_after INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_merge_moves ADD COLUMN IF NOT EXISTS mastered_after INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_merge_moves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'word_merge_moves_session_id_fkey'"
            ") THEN "
            "ALTER TABLE word_merge_moves "
            "ADD CONSTRAINT word_merge_moves_session_id_fkey "
            "FOREIGN KEY (session_id) REFERENCES word_merge_sessions(id) ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_merge_families_status ON word_merge_families (status);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_merge_stages_family_id ON word_merge_stages (family_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_merge_sessions_telegram_id ON word_merge_sessions (telegram_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_merge_moves_session_id ON word_merge_moves (session_id);"))


def ensure_word_shuffle_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_shuffle_entries ("
            "id SERIAL PRIMARY KEY, "
            "word VARCHAR NOT NULL, "
            "translation VARCHAR NOT NULL, "
            "example_sentence TEXT NULL, "
            "cefr_level VARCHAR NULL, "
            "category VARCHAR NULL, "
            "difficulty VARCHAR NOT NULL DEFAULT 'easy', "
            "status VARCHAR NOT NULL DEFAULT 'inactive', "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS word VARCHAR;"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS translation VARCHAR;"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS example_sentence TEXT;"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS cefr_level VARCHAR;"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS category VARCHAR;"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS difficulty VARCHAR NOT NULL DEFAULT 'easy';"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'inactive';"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE word_shuffle_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS word_shuffle_sessions ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "score INTEGER NOT NULL DEFAULT 0, "
            "solved_count INTEGER NOT NULL DEFAULT 0, "
            "best_streak INTEGER NOT NULL DEFAULT 0, "
            "status VARCHAR NOT NULL DEFAULT 'started', "
            "started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "finished_at TIMESTAMPTZ NULL"
            ");"
        ))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS solved_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'started';"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE word_shuffle_sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_shuffle_entries_status ON word_shuffle_entries (status);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_shuffle_entries_difficulty ON word_shuffle_entries (difficulty);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_word_shuffle_sessions_telegram_id ON word_shuffle_sessions (telegram_id);"))


def ensure_activity_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_activity_sessions ("
            "id SERIAL PRIMARY KEY, "
            "session_key VARCHAR NOT NULL UNIQUE, "
            "visitor_key VARCHAR NULL, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "user_name VARCHAR NULL, "
            "current_page VARCHAR NULL, "
            "device_type VARCHAR NULL, "
            "last_feature_counted VARCHAR NULL, "
            "started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS visitor_key VARCHAR;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS user_name VARCHAR;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS current_page VARCHAR;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS device_type VARCHAR;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS last_feature_counted VARCHAR;"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE app_activity_sessions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS feature_usage_counters ("
            "id SERIAL PRIMARY KEY, "
            "feature_name VARCHAR NOT NULL, "
            "usage_date DATE NOT NULL, "
            "count INTEGER NOT NULL DEFAULT 0, "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "UNIQUE(feature_name, usage_date)"
            ");"
        ))
        conn.execute(text("ALTER TABLE feature_usage_counters ADD COLUMN IF NOT EXISTS feature_name VARCHAR;"))
        conn.execute(text("ALTER TABLE feature_usage_counters ADD COLUMN IF NOT EXISTS usage_date DATE;"))
        conn.execute(text("ALTER TABLE feature_usage_counters ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE feature_usage_counters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_app_activity_sessions_last_seen ON app_activity_sessions (last_seen);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_app_activity_sessions_telegram_id ON app_activity_sessions (telegram_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_app_activity_sessions_visitor_key ON app_activity_sessions (visitor_key);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_feature_usage_counters_feature_date ON feature_usage_counters (feature_name, usage_date);"))
