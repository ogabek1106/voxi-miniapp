#backend/app/db.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

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
