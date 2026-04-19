from alembic import op
import sqlalchemy as sa


revision = "20260419_add_listening_tables"
down_revision = "20260412_add_progress_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listening_tests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("audio_url", sa.Text(), nullable=True),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(), nullable=True),
    )

    op.create_table(
        "listening_sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("test_id", sa.Integer(), sa.ForeignKey("listening_tests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("section_number", sa.Integer(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "listening_blocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("section_id", sa.Integer(), sa.ForeignKey("listening_sections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("block_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("start_time_seconds", sa.Integer(), nullable=True),
        sa.Column("end_time_seconds", sa.Integer(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
    )

    op.create_table(
        "listening_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("block_id", sa.Integer(), sa.ForeignKey("listening_blocks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("question_number", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.JSON(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
    )

    op.create_index("ix_listening_sections_test_id", "listening_sections", ["test_id"])
    op.create_index("ix_listening_blocks_section_id", "listening_blocks", ["section_id"])
    op.create_index("ix_listening_questions_block_id", "listening_questions", ["block_id"])


def downgrade():
    op.drop_index("ix_listening_questions_block_id", table_name="listening_questions")
    op.drop_index("ix_listening_blocks_section_id", table_name="listening_blocks")
    op.drop_index("ix_listening_sections_test_id", table_name="listening_sections")

    op.drop_table("listening_questions")
    op.drop_table("listening_blocks")
    op.drop_table("listening_sections")
    op.drop_table("listening_tests")
