window.AdminVCoinPaymentsApi = window.AdminVCoinPaymentsApi || {};

(function () {
  function adminId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  AdminVCoinPaymentsApi.getSettings = function () {
    return apiGet(`/vcoins/admin/payment-settings?admin_id=${encodeURIComponent(adminId() || "")}`);
  };

  AdminVCoinPaymentsApi.saveSettings = function (exchangeRateUzs) {
    return apiPost("/vcoins/admin/payment-settings", {
      admin_id: adminId(),
      exchange_rate_uzs: Number(exchangeRateUzs || 0)
    });
  };

  AdminVCoinPaymentsApi.listPromos = function () {
    return apiGet(`/vcoins/admin/promo-codes?admin_id=${encodeURIComponent(adminId() || "")}`);
  };

  AdminVCoinPaymentsApi.savePromo = function (payload) {
    return apiPost("/vcoins/admin/promo-codes", {
      ...payload,
      admin_id: adminId()
    });
  };

  AdminVCoinPaymentsApi.disablePromo = function (id) {
    return apiDelete(`/vcoins/admin/promo-codes/${Number(id)}?admin_id=${encodeURIComponent(adminId() || "")}`);
  };
})();
