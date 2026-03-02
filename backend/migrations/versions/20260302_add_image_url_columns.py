from alembic import op
import sqlalchemy as sa

revision = "20260302_add_image_url_columns"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("reading_passages", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("reading_questions", sa.Column("image_url", sa.Text(), nullable=True))

def downgrade():
    op.drop_column("reading_passages", "image_url")
    op.drop_column("reading_questions", "image_url")
