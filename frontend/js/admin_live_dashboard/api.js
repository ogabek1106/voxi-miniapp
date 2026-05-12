window.AdminLiveDashboardApi = window.AdminLiveDashboardApi || {};

(function () {
  function adminTelegramId() {
    const websiteUser = window.WebsiteAuthState?.getUser?.() || null;
    return window.getTelegramId?.() || websiteUser?.telegram_id || "";
  }

  AdminLiveDashboardApi.load = function () {
    const telegramId = adminTelegramId();
    if (!telegramId) throw new Error("telegram_id_required");
    return apiGet(`/admin/live-dashboard?telegram_id=${encodeURIComponent(telegramId)}`);
  };
})();
