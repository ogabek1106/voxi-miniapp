# backend/app/migrations/versions/20260412_add_progress_fields.py

from alembic import op
import sqlalchemy as sa

revision = "20260412_add_progress_fields"
down_revision = "20260310_fix_json_columns"
branch_labels = None
depends_on = None


def upgrade():

    # 1. Add is_submitted
    op.add_column(
        "reading_progress",
        sa.Column("is_submitted", sa.Boolean(), nullable=False, server_default="false")
    )

    # 2. Add submitted_at
    op.add_column(
        "reading_progress",
        sa.Column("submitted_at", sa.TIMESTAMP(), nullable=True)
    )

    # 3. Add raw_score
    op.add_column(
        "reading_progress",
        sa.Column("raw_score", sa.Integer(), nullable=True)
    )

    # 4. Add max_score
    op.add_column(
        "reading_progress",
        sa.Column("max_score", sa.Integer(), nullable=True)
    )

    # 5. Add band_score
    op.add_column(
        "reading_progress",
        sa.Column("band_score", sa.Numeric(3, 1), nullable=True)
    )

    # 6. Add UNIQUE constraint (CRITICAL)
    op.create_unique_constraint(
        "uq_reading_progress_user_test",
        "reading_progress",
        ["user_id", "test_id"]
    )


def downgrade():
    pass
