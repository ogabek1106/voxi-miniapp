from alembic import op


revision = "20260426_add_vcoin_tables"
down_revision = "20260419_add_listening_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE users "
        "ADD COLUMN IF NOT EXISTS v_coins INTEGER NOT NULL DEFAULT 0;"
    )

    op.execute(
        "CREATE TABLE IF NOT EXISTS payment_requests ("
        "id SERIAL PRIMARY KEY, "
        "telegram_id BIGINT NOT NULL, "
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
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_payment_requests_telegram_id "
        "ON payment_requests (telegram_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_payment_requests_receipt_image_hash "
        "ON payment_requests (receipt_image_hash);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_payment_requests_status "
        "ON payment_requests (status);"
    )

    op.execute(
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
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coin_ledger_telegram_id "
        "ON coin_ledger (telegram_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coin_ledger_reason "
        "ON coin_ledger (reason);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coin_ledger_reference_id "
        "ON coin_ledger (reference_id);"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_coin_ledger_reference_id;")
    op.execute("DROP INDEX IF EXISTS ix_coin_ledger_reason;")
    op.execute("DROP INDEX IF EXISTS ix_coin_ledger_telegram_id;")
    op.execute("DROP TABLE IF EXISTS coin_ledger;")

    op.execute("DROP INDEX IF EXISTS ix_payment_requests_status;")
    op.execute("DROP INDEX IF EXISTS ix_payment_requests_receipt_image_hash;")
    op.execute("DROP INDEX IF EXISTS ix_payment_requests_telegram_id;")
    op.execute("DROP TABLE IF EXISTS payment_requests;")

    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS v_coins;")
