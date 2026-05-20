(function () {
  window.PremiereApi = {
    active(identity) {
      const params = new URLSearchParams();
      if (typeof identity === "number" || typeof identity === "string") {
        if (identity) params.set("telegram_id", identity);
      } else if (identity) {
        if (identity.telegram_id) params.set("telegram_id", identity.telegram_id);
        if (identity.user_id) params.set("user_id", identity.user_id);
        if (identity.email) params.set("email", identity.email);
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      return apiGet(`/premiere/active${qs}`);
    },
    createPaymentIntent(packId, identity) {
      return apiPost(`/premiere/${packId}/payment-intents`, {
        telegram_id: identity?.telegram_id || null,
        user_id: identity?.user_id || null,
        email: identity?.email || null,
      });
    },
    paymentIntent(paymentToken, identity) {
      const params = new URLSearchParams();
      if (identity?.telegram_id) params.set("telegram_id", identity.telegram_id);
      if (identity?.user_id) params.set("user_id", identity.user_id);
      if (identity?.email) params.set("email", identity.email);
      const qs = params.toString() ? `?${params.toString()}` : "";
      return apiGet(`/premiere/payment-intents/${encodeURIComponent(paymentToken)}${qs}`);
    },
  };
})();
