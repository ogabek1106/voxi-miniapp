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


def ensure_xp_schema():
    with engine.connect() as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS user_xp ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE, "
            "telegram_id BIGINT NULL, "
            "total_xp INTEGER NOT NULL DEFAULT 0, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS xp_events ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL, "
            "telegram_id BIGINT NULL, "
            "amount INTEGER NOT NULL, "
            "source_type VARCHAR NOT NULL, "
            "reason VARCHAR NOT NULL, "
            "related_attempt_id INTEGER NULL, "
            "related_session_id INTEGER NULL, "
            "event_key VARCHAR NULL, "
            "meta JSONB NULL, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS source_type VARCHAR;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS reason VARCHAR;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS related_attempt_id INTEGER;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS related_session_id INTEGER;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS event_key VARCHAR;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS meta JSONB;"))
        conn.execute(text("ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS xp_visibility_settings ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE, "
            "telegram_id BIGINT NULL, "
            "nickname VARCHAR NULL, "
            "show_full_name BOOLEAN NOT NULL DEFAULT FALSE, "
            "show_full_username BOOLEAN NOT NULL DEFAULT TRUE, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS nickname VARCHAR;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS public_anon_code VARCHAR;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS show_full_name BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS show_full_username BOOLEAN NOT NULL DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE xp_visibility_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_xp_user_id ON user_xp (user_id) WHERE user_id IS NOT NULL;"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_xp_telegram_id ON user_xp (telegram_id) WHERE telegram_id IS NOT NULL;"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_xp_total_xp ON user_xp (total_xp DESC);"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_events_event_key ON xp_events (event_key) WHERE event_key IS NOT NULL;"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_xp_events_user_created ON xp_events (user_id, created_at DESC);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_xp_events_telegram_created ON xp_events (telegram_id, created_at DESC);"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_visibility_user_id ON xp_visibility_settings (user_id) WHERE user_id IS NOT NULL;"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_visibility_telegram_id ON xp_visibility_settings (telegram_id) WHERE telegram_id IS NOT NULL;"))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_visibility_nickname_lower "
            "ON xp_visibility_settings (LOWER(nickname)) "
            "WHERE nickname IS NOT NULL AND BTRIM(nickname) <> '';"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_visibility_public_anon_code "
            "ON xp_visibility_settings (public_anon_code) "
            "WHERE public_anon_code IS NOT NULL AND BTRIM(public_anon_code) <> '';"
        ))
        conn.commit()


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
        conn.execute(text("ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS reading_progress_user_id_test_id_key;"))
        conn.execute(text("ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS uq_reading_progress_user_test;"))
        conn.execute(text("ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS uq_reading_progress_user_id_test_id;"))
        conn.execute(text("ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS unique_reading_progress_user_test;"))
        conn.execute(text("DROP INDEX IF EXISTS reading_progress_user_id_test_id_key;"))
        conn.execute(text("DROP INDEX IF EXISTS uq_reading_progress_user_test;"))
        conn.execute(text("DROP INDEX IF EXISTS uq_reading_progress_user_id_test_id;"))
        conn.execute(text("DROP INDEX IF EXISTS unique_reading_progress_user_test;"))
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


def ensure_listening_progress_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS listening_progress ("
            "id SERIAL PRIMARY KEY, "
            "test_id INTEGER NOT NULL, "
            "telegram_id BIGINT NOT NULL, "
            "session_mode VARCHAR NOT NULL DEFAULT 'single_block', "
            "answers JSONB NOT NULL DEFAULT '{}'::jsonb, "
            "started_at TIMESTAMPTZ NULL, "
            "updated_at TIMESTAMPTZ NULL, "
            "submitted_at TIMESTAMPTZ NULL, "
            "is_submitted BOOLEAN NOT NULL DEFAULT FALSE, "
            "raw_score INTEGER NULL, "
            "max_score INTEGER NULL, "
            "band_score DOUBLE PRECISION NULL"
            ");"
        ))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS test_id INTEGER;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS session_mode VARCHAR NOT NULL DEFAULT 'single_block';"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS raw_score INTEGER;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS max_score INTEGER;"))
        conn.execute(text("ALTER TABLE listening_progress ADD COLUMN IF NOT EXISTS band_score DOUBLE PRECISION;"))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'listening_progress_test_id_fkey'"
            ") THEN "
            "ALTER TABLE listening_progress "
            "ADD CONSTRAINT listening_progress_test_id_fkey "
            "FOREIGN KEY (test_id) REFERENCES listening_tests(id) ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_listening_progress_mode "
            "ON listening_progress (telegram_id, test_id, session_mode, id);"
        ))


def ensure_premiere_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_is_active BOOLEAN NOT NULL DEFAULT FALSE;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_ends_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_price_uzs INTEGER;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_label VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_description TEXT;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_theme VARCHAR;"
        ))
        conn.execute(text(
            "ALTER TABLE mock_packs "
            "ADD COLUMN IF NOT EXISTS premiere_updated_at TIMESTAMPTZ;"
        ))
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS premiere_accesses ("
            "id SERIAL PRIMARY KEY, "
            "mock_pack_id INTEGER NOT NULL, "
            "telegram_id BIGINT NULL, "
            "user_id INTEGER NULL, "
            "email VARCHAR NULL, "
            "payment_request_id INTEGER NULL, "
            "status VARCHAR NOT NULL DEFAULT 'active', "
            "created_at TIMESTAMPTZ NULL, "
            "expires_at TIMESTAMPTZ NULL"
            ");"
        ))
        conn.execute(text("ALTER TABLE premiere_accesses ALTER COLUMN telegram_id DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS email VARCHAR;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS payment_request_id INTEGER;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active';"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;"))
        conn.execute(text("ALTER TABLE premiere_accesses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;"))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'premiere_accesses_mock_pack_id_fkey'"
            ") THEN "
            "ALTER TABLE premiere_accesses "
            "ADD CONSTRAINT premiere_accesses_mock_pack_id_fkey "
            "FOREIGN KEY (mock_pack_id) REFERENCES mock_packs(id) ON DELETE CASCADE; "
            "END IF; "
            "END "
            "$$;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_premiere_access_user_pack "
            "ON premiere_accesses (telegram_id, mock_pack_id, status);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_premiere_access_website_user_pack "
            "ON premiere_accesses (user_id, mock_pack_id, status);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_premiere_access_email_pack "
            "ON premiere_accesses (email, mock_pack_id, status);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_premiere_active_packs "
            "ON mock_packs (premiere_is_active, premiere_ends_at);"
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
            "telegram_id BIGINT NULL, "
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
        conn.execute(text("ALTER TABLE payment_requests ALTER COLUMN telegram_id DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS email VARCHAR;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payment_token VARCHAR;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS exchange_rate_uzs INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS subtotal_amount INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS promo_code VARCHAR;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS discount_percent INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS discount_amount INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS final_amount INTEGER;"))
        conn.execute(text("ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_telegram_id "
            "ON payment_requests (telegram_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_user_id "
            "ON payment_requests (user_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_email "
            "ON payment_requests (email);"
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
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_payment_token "
            "ON payment_requests (payment_token) WHERE payment_token IS NOT NULL;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_payment_requests_promo_code "
            "ON payment_requests (promo_code);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS vcoin_payment_settings ("
            "id INTEGER PRIMARY KEY, "
            "exchange_rate_uzs INTEGER NOT NULL DEFAULT 5000, "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE vcoin_payment_settings ADD COLUMN IF NOT EXISTS exchange_rate_uzs INTEGER NOT NULL DEFAULT 5000;"))
        conn.execute(text("ALTER TABLE vcoin_payment_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "INSERT INTO vcoin_payment_settings (id, exchange_rate_uzs, updated_at) "
            "VALUES (1, 5000, NOW()) "
            "ON CONFLICT (id) DO NOTHING;"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS vcoin_promo_codes ("
            "id SERIAL PRIMARY KEY, "
            "code VARCHAR NOT NULL UNIQUE, "
            "scope VARCHAR NOT NULL DEFAULT 'vcoin', "
            "discount_percent INTEGER NOT NULL, "
            "is_active BOOLEAN NOT NULL DEFAULT TRUE, "
            "expires_at TIMESTAMPTZ NULL, "
            "usage_limit INTEGER NULL, "
            "successful_uses INTEGER NOT NULL DEFAULT 0, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS code VARCHAR;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS scope VARCHAR NOT NULL DEFAULT 'vcoin';"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS discount_percent INTEGER;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS usage_limit INTEGER;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS successful_uses INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE vcoin_promo_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_vcoin_promo_codes_code "
            "ON vcoin_promo_codes (code);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_vcoin_promo_codes_scope "
            "ON vcoin_promo_codes (scope);"
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
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS manual_balance_adjustments ("
            "id SERIAL PRIMARY KEY, "
            "target_user_id INTEGER NOT NULL, "
            "target_telegram_id BIGINT NULL, "
            "admin_telegram_id BIGINT NOT NULL, "
            "action_type VARCHAR NOT NULL, "
            "amount INTEGER NOT NULL, "
            "balance_before INTEGER NOT NULL, "
            "balance_after INTEGER NOT NULL, "
            "reason VARCHAR NOT NULL, "
            "note TEXT NULL, "
            "ledger_id INTEGER NULL, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS target_user_id INTEGER;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS target_telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS admin_telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS action_type VARCHAR;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS amount INTEGER;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS balance_before INTEGER;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS balance_after INTEGER;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS reason VARCHAR;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS note TEXT;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS ledger_id INTEGER;"))
        conn.execute(text("ALTER TABLE manual_balance_adjustments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_manual_balance_adjustments_target_user "
            "ON manual_balance_adjustments (target_user_id, created_at DESC);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_manual_balance_adjustments_admin "
            "ON manual_balance_adjustments (admin_telegram_id, created_at DESC);"
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
            "ADD COLUMN IF NOT EXISTS username VARCHAR;"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_users_username "
            "ON users (username);"
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
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS audience_type VARCHAR NOT NULL DEFAULT 'all';"))
        conn.execute(text("ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0;"))
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
            "CREATE INDEX IF NOT EXISTS ix_app_notifications_audience_type "
            "ON app_notifications (audience_type);"
        ))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_notification_recipients ("
            "id SERIAL PRIMARY KEY, "
            "notification_id INTEGER NOT NULL, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE app_notification_recipients ADD COLUMN IF NOT EXISTS notification_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_notification_recipients ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_notification_recipients ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE app_notification_recipients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_recipients_notification_id "
            "ON app_notification_recipients (notification_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_recipients_user_id "
            "ON app_notification_recipients (user_id);"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_notification_recipients_telegram_id "
            "ON app_notification_recipients (telegram_id);"
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


def ensure_feedback_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS app_feedback ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "feature_type VARCHAR NOT NULL, "
            "context_key VARCHAR NOT NULL, "
            "rating INTEGER NULL, "
            "comment TEXT NULL, "
            "public_permission BOOLEAN NOT NULL DEFAULT FALSE, "
            "public_approved BOOLEAN NOT NULL DEFAULT FALSE, "
            "is_hidden BOOLEAN NOT NULL DEFAULT FALSE, "
            "status VARCHAR NOT NULL DEFAULT 'submitted', "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS feature_type VARCHAR;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS context_key VARCHAR;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS rating INTEGER;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS comment TEXT;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS public_permission BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS public_approved BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'submitted';"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_app_feedback_feature_created "
            "ON app_feedback (feature_type, created_at DESC);"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_app_feedback_telegram_context "
            "ON app_feedback (telegram_id, feature_type, context_key) "
            "WHERE telegram_id IS NOT NULL;"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_app_feedback_user_context "
            "ON app_feedback (user_id, feature_type, context_key) "
            "WHERE user_id IS NOT NULL;"
        ))
        conn.execute(text(
            "DO $$ "
            "BEGIN "
            "IF NOT EXISTS ("
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_name = 'app_feedback_user_id_fkey'"
            ") THEN "
            "ALTER TABLE app_feedback "
            "ADD CONSTRAINT app_feedback_user_id_fkey "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL; "
            "END IF; "
            "END "
            "$$;"
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


def ensure_match_words_schema():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS match_words ("
            "id SERIAL PRIMARY KEY, "
            "english_text VARCHAR NOT NULL, "
            "translation_text VARCHAR NOT NULL, "
            "level VARCHAR NOT NULL DEFAULT 'B1', "
            "theme VARCHAR NULL, "
            "is_active BOOLEAN NOT NULL DEFAULT FALSE, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ");"
        ))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS english_text VARCHAR;"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS translation_text VARCHAR;"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS level VARCHAR NOT NULL DEFAULT 'B1';"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS theme VARCHAR;"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE match_words ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS match_words_sessions ("
            "id SERIAL PRIMARY KEY, "
            "user_id INTEGER NULL, "
            "telegram_id BIGINT NULL, "
            "correct_count INTEGER NOT NULL DEFAULT 0, "
            "wrong_count INTEGER NOT NULL DEFAULT 0, "
            "best_combo INTEGER NOT NULL DEFAULT 0, "
            "survived_seconds INTEGER NOT NULL DEFAULT 0, "
            "average_match_seconds DOUBLE PRECISION NULL, "
            "xp_earned INTEGER NOT NULL DEFAULT 0, "
            "status VARCHAR NOT NULL DEFAULT 'started', "
            "meta JSONB NULL, "
            "started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "finished_at TIMESTAMPTZ NULL"
            ");"
        ))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS telegram_id BIGINT;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS wrong_count INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS best_combo INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS survived_seconds INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS average_match_seconds DOUBLE PRECISION;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'started';"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS meta JSONB;"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE match_words_sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_match_words_active_level ON match_words (is_active, level);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_match_words_theme ON match_words (theme);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_match_words_sessions_user_id ON match_words_sessions (user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_match_words_sessions_telegram_id ON match_words_sessions (telegram_id);"))


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
