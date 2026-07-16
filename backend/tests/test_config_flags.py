import importlib

import app.config as config


def test_payment_feature_flags_default_to_uzs_enabled(monkeypatch):
    monkeypatch.delenv("VCOIN_ENABLED", raising=False)
    monkeypatch.delenv("UZS_PAYMENTS_ENABLED", raising=False)

    reloaded = importlib.reload(config)

    assert reloaded.VCOIN_ENABLED is False
    assert reloaded.UZS_PAYMENTS_ENABLED is True


def test_payment_feature_flags_can_restore_vcoin(monkeypatch):
    monkeypatch.setenv("VCOIN_ENABLED", "true")
    monkeypatch.setenv("UZS_PAYMENTS_ENABLED", "false")

    reloaded = importlib.reload(config)

    assert reloaded.VCOIN_ENABLED is True
    assert reloaded.UZS_PAYMENTS_ENABLED is False
