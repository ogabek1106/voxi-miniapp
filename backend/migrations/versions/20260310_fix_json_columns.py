# backend/app/migrations/versions/20260310_fix_json_columns.py
from alembic import op
import sqlalchemy as sa

revision = "20260310_fix_json_columns"
down_revision = "20260302_add_image_url_columns"
branch_labels = None
depends_on = None


def upgrade():

    op.execute("""
        ALTER TABLE reading_questions
        ALTER COLUMN content
        TYPE jsonb
        USING content::jsonb;
    """)

    op.execute("""
        ALTER TABLE reading_questions
        ALTER COLUMN correct_answer
        TYPE jsonb
        USING correct_answer::jsonb;
    """)

    op.execute("""
        ALTER TABLE reading_questions
        ALTER COLUMN meta
        TYPE jsonb
        USING meta::jsonb;
    """)

    op.execute("""
        ALTER TABLE reading_progress
        ALTER COLUMN answers
        TYPE jsonb
        USING answers::jsonb;
    """)


def downgrade():
    pass
