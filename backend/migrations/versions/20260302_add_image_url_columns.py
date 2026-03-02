from alembic import op
import sqlalchemy as sa

# --- Revision identifiers ---
revision = "20260302_add_image_url_columns"
down_revision = None   # change this if you already have previous migration
branch_labels = None
depends_on = None


def upgrade():
    # ---- reading_passages ----
    op.add_column(
        "reading_passages",
        sa.Column("image_url", sa.Text(), nullable=True)
    )

    # ---- reading_questions ----
    op.add_column(
        "reading_questions",
        sa.Column("image_url", sa.Text(), nullable=True)
    )

    op.add_column(
        "reading_questions",
        sa.Column("instruction", sa.Text(), nullable=True)
    )

    op.add_column(
        "reading_questions",
        sa.Column("meta", sa.JSON(), nullable=True)
    )

    op.add_column(
        "reading_questions",
        sa.Column("explanation", sa.Text(), nullable=True)
    )

    op.add_column(
        "reading_questions",
        sa.Column("points", sa.Integer(), nullable=True)
    )


def downgrade():
    # ---- reading_questions (reverse order) ----
    op.drop_column("reading_questions", "points")
    op.drop_column("reading_questions", "explanation")
    op.drop_column("reading_questions", "meta")
    op.drop_column("reading_questions", "instruction")
    op.drop_column("reading_questions", "image_url")

    # ---- reading_passages ----
    op.drop_column("reading_passages", "image_url")
