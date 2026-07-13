from alembic import op
import sqlalchemy as sa


revision = "20260713_click_tables"
down_revision = "20260712_payme_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "click_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("click_trans_id", sa.BigInteger(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("click_paydoc_id", sa.BigInteger(), nullable=False),
        sa.Column("merchant_trans_id", sa.String(length=48), nullable=False),
        sa.Column("merchant_prepare_id", sa.Integer(), nullable=True),
        sa.Column("merchant_confirm_id", sa.Integer(), nullable=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("payment_orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("amount_tiyin", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("state", sa.String(length=32), nullable=False, server_default="prepared"),
        sa.Column("error", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_note", sa.String(length=255), nullable=False, server_default="Success"),
        sa.Column("sign_time", sa.String(length=32), nullable=False),
        sa.Column("raw_prepare_request", sa.JSON(), nullable=True),
        sa.Column("raw_complete_request", sa.JSON(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("amount_tiyin > 0", name="ck_click_transactions_amount_positive"),
        sa.CheckConstraint("action IN (0, 1)", name="ck_click_transactions_action"),
        sa.CheckConstraint(
            "state IN ('prepared', 'completed', 'cancelled', 'failed')",
            name="ck_click_transactions_state",
        ),
        sa.UniqueConstraint("click_trans_id", name="uq_click_transactions_click_trans_id"),
        sa.UniqueConstraint("click_paydoc_id", name="uq_click_transactions_click_paydoc_id"),
    )
    op.create_index("ix_click_transactions_click_trans_id", "click_transactions", ["click_trans_id"])
    op.create_index("ix_click_transactions_service_id", "click_transactions", ["service_id"])
    op.create_index("ix_click_transactions_click_paydoc_id", "click_transactions", ["click_paydoc_id"])
    op.create_index("ix_click_transactions_merchant_trans_id", "click_transactions", ["merchant_trans_id"])
    op.create_index("ix_click_transactions_merchant_prepare_id", "click_transactions", ["merchant_prepare_id"])
    op.create_index("ix_click_transactions_order_id", "click_transactions", ["order_id"])
    op.create_index("ix_click_transactions_state", "click_transactions", ["state"])
    op.create_index("ix_click_transactions_order_state", "click_transactions", ["order_id", "state"])


def downgrade():
    op.drop_index("ix_click_transactions_order_state", table_name="click_transactions")
    op.drop_index("ix_click_transactions_state", table_name="click_transactions")
    op.drop_index("ix_click_transactions_order_id", table_name="click_transactions")
    op.drop_index("ix_click_transactions_merchant_prepare_id", table_name="click_transactions")
    op.drop_index("ix_click_transactions_merchant_trans_id", table_name="click_transactions")
    op.drop_index("ix_click_transactions_click_paydoc_id", table_name="click_transactions")
    op.drop_index("ix_click_transactions_service_id", table_name="click_transactions")
    op.drop_index("ix_click_transactions_click_trans_id", table_name="click_transactions")
    op.drop_table("click_transactions")
