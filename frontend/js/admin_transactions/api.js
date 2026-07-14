window.AdminTransactionsApi = window.AdminTransactionsApi || {};

(function () {
  function telegramId() {
    return window.getTelegramId?.() || window.WebsiteAuthState?.getUser?.()?.telegram_id || "";
  }

  function query(params = {}) {
    const search = new URLSearchParams();
    search.set("telegram_id", telegramId());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      search.set(key, String(value));
    });
    return search.toString();
  }

  AdminTransactionsApi.list = function (params) {
    return apiGet(`/admin/transactions?${query(params)}`);
  };

  AdminTransactionsApi.summary = function (params) {
    return apiGet(`/admin/transactions/summary?${query(params)}`);
  };

  AdminTransactionsApi.detail = function (orderRef) {
    return apiGet(`/admin/transactions/${encodeURIComponent(orderRef)}?${query()}`);
  };
})();
