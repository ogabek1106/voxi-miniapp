window.AdminWordShuffleStatsApi = window.AdminWordShuffleStatsApi || {};

(function () {
  function adminTelegramId() {
    const websiteUser = window.WebsiteAuthState?.getUser?.() || null;
    return window.getTelegramId?.() || websiteUser?.telegram_id || "";
  }

  AdminWordShuffleStatsApi.load = function () {
    const telegramId = adminTelegramId();
    if (!telegramId) throw new Error("telegram_id_required");
    return apiGet(`/admin/word-shuffle/stats?telegram_id=${encodeURIComponent(telegramId)}`);
  };
})();
