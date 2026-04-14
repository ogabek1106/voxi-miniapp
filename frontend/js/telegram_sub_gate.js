// frontend/js/telegram_sub_gate.js
window.TelegramSubGate = window.TelegramSubGate || {};

TelegramSubGate.getInitData = function () {
  return window.Telegram?.WebApp?.initData || "";
};

TelegramSubGate.checkReadingEntry = async function (mockId) {
  const initData = TelegramSubGate.getInitData();

  if (!initData) {
    return { ok: false, reason: "no_init_data" };
  }

  try {
    const res = await fetch(`/mock-tests/${mockId}/reading/entry-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        init_data: initData
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
      reason: result?.reason || "entry_check_failed"
    };
  }

  return {
    ok: true,
    data: result
  };
};
