#backend/app/db.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
def ensure_reading_progress_columns():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE reading_progress
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
        """))
        conn.execute(text("""
            ALTER TABLE reading_progress
            ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
        """))
        conn.commit()

from sqlalchemy import text

def ensure_mock_pack_column():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE reading_tests
            ADD COLUMN IF NOT EXISTS mock_pack_id INTEGER;
        """))

        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'reading_tests_mock_pack_id_fkey'
                ) THEN
                    ALTER TABLE reading_tests
                    ADD CONSTRAINT reading_tests_mock_pack_id_fkey
                    FOREIGN KEY (mock_pack_id)
                    REFERENCES mock_packs(id)
                    ON DELETE CASCADE;
                END IF;
            END
            $$;
        """))

        conn.commit()
