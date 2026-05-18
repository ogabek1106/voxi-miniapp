(function () {
  window.PremiereApi = {
    active(telegramId) {
      const qs = telegramId ? `?telegram_id=${encodeURIComponent(telegramId)}` : "";
      return apiGet(`/premiere/active${qs}`);
    },
    createPaymentIntent(packId, telegramId) {
      return apiPost(`/premiere/${packId}/payment-intents`, { telegram_id: Number(telegramId) });
    },
  };
})();
