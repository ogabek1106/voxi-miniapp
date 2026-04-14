// frontend/js/telegram_sub_gate.js
window.TelegramSubGate = window.TelegramSubGate || {};
TelegramSubGate._recheckTimer = null;
TelegramSubGate._recheckStartedAt = 0;
TelegramSubGate._recheckMockId = null;

TelegramSubGate.getInitData = function () {
  return window.Telegram?.WebApp?.initData || "";
};

TelegramSubGate.checkReadingEntry = async function (mockId) {
  const initData = TelegramSubGate.getInitData();
  const telegramId = window.getTelegramId ? window.getTelegramId() : null;

  if (!initData && !telegramId) {
    return { ok: false, reason: "no_init_data" };
  }

  try {
    const res = await fetch(`/mock-tests/${mockId}/reading/entry-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        init_data: initData || "",
        telegram_id: telegramId || null
      })
    });

    const data = await res.json();
    return data;

  } catch (err) {
    return { ok: false, reason: "network_error" };
  }
};

TelegramSubGate.enterReadingWithGate = async function (mockId) {
  const result = await TelegramSubGate.checkReadingEntry(mockId);

  if (!result || !result.ok) {
    return {
      ok: false,
      reason: result?.reason || "entry_check_failed",
      raw: result || null
    };
  }

  return {
    ok: true,
    data: result
  };
};

TelegramSubGate.stopEntryRecheck = function () {
  if (TelegramSubGate._recheckTimer) {
    clearInterval(TelegramSubGate._recheckTimer);
    TelegramSubGate._recheckTimer = null;
  }
  TelegramSubGate._recheckStartedAt = 0;
  TelegramSubGate._recheckMockId = null;
};

TelegramSubGate.startEntryRecheck = function (mockId, callbacks = {}) {
  const onSuccess = callbacks.onSuccess || function () {};
  const onProgress = callbacks.onProgress || function () {};
  const onTimeout = callbacks.onTimeout || function () {};

  TelegramSubGate.stopEntryRecheck();
  TelegramSubGate._recheckMockId = mockId;
  TelegramSubGate._recheckStartedAt = Date.now();

  const maxMs = 3 * 60 * 1000; // 3 minutes
  const intervalMs = 3000; // 3 seconds

  const tick = async function () {
    if (!TelegramSubGate._recheckMockId) return;

    const elapsed = Date.now() - TelegramSubGate._recheckStartedAt;
    if (elapsed >= maxMs) {
      TelegramSubGate.stopEntryRecheck();
      onTimeout();
      return;
    }

    onProgress(elapsed);

    const result = await TelegramSubGate.checkReadingEntry(mockId);

    if (result && result.ok) {
      TelegramSubGate.stopEntryRecheck();
      onSuccess(result);
      return;
    }

    alert(
      "RECHECK FAILED\n" +
      "reason: " + (result?.reason || "unknown")
    );
  };

  // Start with one immediate check, then periodic checks.
  tick();
  TelegramSubGate._recheckTimer = setInterval(tick, intervalMs);
};
