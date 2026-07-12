from alembic import op
import sqlalchemy as sa


revision = "20260712_payme_tables"
down_revision = "20260426_add_vcoin_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_ref", sa.String(length=48), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("product_type", sa.String(length=32), nullable=False),
        sa.Column("product_data", sa.JSON(), nullable=False),
        sa.Column("quote_snapshot", sa.JSON(), nullable=False),
        sa.Column("amount_tiyin", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="UZS"),
        sa.Column("payment_provider", sa.String(length=32), nullable=False, server_default="payme"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("fulfillment_status", sa.String(length=32), nullable=False, server_default="not_started"),
        sa.Column("fulfillment_ledger_id", sa.Integer(), sa.ForeignKey("coin_ledger.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("fulfillment_error", sa.Text(), nullable=True),
        sa.Column("payment_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("amount_tiyin > 0", name="ck_payment_orders_amount_positive"),
        sa.CheckConstraint("product_type <> ''", name="ck_payment_orders_product_type_not_empty"),
        sa.CheckConstraint("currency = 'UZS'", name="ck_payment_orders_currency_uzs"),
        sa.CheckConstraint(
            "status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'expired', 'fulfillment_failed')",
            name="ck_payment_orders_status",
        ),
        sa.CheckConstraint(
            "fulfillment_status IN ('not_started', 'processing', 'fulfilled', 'failed')",
            name="ck_payment_orders_fulfillment_status",
        ),
        sa.UniqueConstraint("order_ref", name="uq_payment_orders_order_ref"),
        sa.UniqueConstraint("fulfillment_ledger_id", name="uq_payment_orders_fulfillment_ledger_id"),
    )
    op.create_index("ix_payment_orders_order_ref", "payment_orders", ["order_ref"])
    op.create_index("ix_payment_orders_user_id", "payment_orders", ["user_id"])
    op.create_index("ix_payment_orders_telegram_id", "payment_orders", ["telegram_id"])
    op.create_index("ix_payment_orders_product_type", "payment_orders", ["product_type"])
    op.create_index("ix_payment_orders_payment_provider", "payment_orders", ["payment_provider"])
    op.create_index("ix_payment_orders_status", "payment_orders", ["status"])
    op.create_index("ix_payment_orders_fulfillment_status", "payment_orders", ["fulfillment_status"])
    op.create_index("ix_payment_orders_expires_at", "payment_orders", ["expires_at"])
    op.create_index("ix_payment_orders_user_status", "payment_orders", ["user_id", "status"])
    op.create_index("ix_payment_orders_product_status", "payment_orders", ["product_type", "status"])

    op.create_table(
        "payme_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payme_transaction_id", sa.String(length=24), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("payment_orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payme_time_ms", sa.BigInteger(), nullable=False),
        sa.Column("amount_tiyin", sa.BigInteger(), nullable=False),
        sa.Column("state", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reason", sa.Integer(), nullable=True),
        sa.Column("create_time_ms", sa.BigInteger(), nullable=False),
        sa.Column("perform_time_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("cancel_time_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("account", sa.JSON(), nullable=False),
        sa.Column("raw_create_request", sa.JSON(), nullable=True),
        sa.Column("raw_perform_request", sa.JSON(), nullable=True),
        sa.Column("raw_cancel_request", sa.JSON(), nullable=True),
        sa.Column("raw_check_request", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("char_length(payme_transaction_id) = 24", name="ck_payme_transactions_payme_id_len"),
        sa.CheckConstraint("amount_tiyin > 0", name="ck_payme_transactions_amount_positive"),
        sa.CheckConstraint("state IN (1, 2, -1, -2)", name="ck_payme_transactions_state"),
        sa.CheckConstraint("create_time_ms > 0", name="ck_payme_transactions_create_time_positive"),
        sa.CheckConstraint("perform_time_ms >= 0", name="ck_payme_transactions_perform_time_nonnegative"),
        sa.CheckConstraint("cancel_time_ms >= 0", name="ck_payme_transactions_cancel_time_nonnegative"),
        sa.UniqueConstraint("payme_transaction_id", name="uq_payme_transactions_payme_id"),
    )
    op.create_index("ix_payme_transactions_payme_transaction_id", "payme_transactions", ["payme_transaction_id"])
    op.create_index("ix_payme_transactions_order_id", "payme_transactions", ["order_id"])
    op.create_index("ix_payme_transactions_payme_time_ms", "payme_transactions", ["payme_time_ms"])
    op.create_index("ix_payme_transactions_state", "payme_transactions", ["state"])
    op.create_index(
        "uq_payme_transactions_one_active_per_order",
        "payme_transactions",
        ["order_id"],
        unique=True,
        postgresql_where=sa.text("state IN (1, 2)"),
    )


def downgrade():
    op.drop_index("uq_payme_transactions_one_active_per_order", table_name="payme_transactions")
    op.drop_index("ix_payme_transactions_state", table_name="payme_transactions")
    op.drop_index("ix_payme_transactions_payme_time_ms", table_name="payme_transactions")
    op.drop_index("ix_payme_transactions_order_id", table_name="payme_transactions")
    op.drop_index("ix_payme_transactions_payme_transaction_id", table_name="payme_transactions")
    op.drop_table("payme_transactions")

    op.drop_index("ix_payment_orders_product_status", table_name="payment_orders")
    op.drop_index("ix_payment_orders_user_status", table_name="payment_orders")
    op.drop_index("ix_payment_orders_expires_at", table_name="payment_orders")
    op.drop_index("ix_payment_orders_fulfillment_status", table_name="payment_orders")
    op.drop_index("ix_payment_orders_status", table_name="payment_orders")
    op.drop_index("ix_payment_orders_payment_provider", table_name="payment_orders")
    op.drop_index("ix_payment_orders_product_type", table_name="payment_orders")
    op.drop_index("ix_payment_orders_telegram_id", table_name="payment_orders")
    op.drop_index("ix_payment_orders_user_id", table_name="payment_orders")
    op.drop_index("ix_payment_orders_order_ref", table_name="payment_orders")
    op.drop_table("payment_orders")
