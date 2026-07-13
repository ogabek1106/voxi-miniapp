window.ClickTestAPI = window.ClickTestAPI || {};

(function () {
  const SIMULATE_PATH = "/payments/click/test/simulate";

  async function simulateAction(payload) {
    return await window.apiRequest(SIMULATE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function getBalance(telegramId) {
    if (!telegramId) return 0;
    const data = await window.apiGet(`/vcoins/balance?telegram_id=${Number(telegramId)}`);
    return Number(data?.v_coins || 0);
  }

  window.ClickTestAPI = {
    simulateAction,
    getBalance
  };
})();
