window.AdminMatchWordsStatsApi = window.AdminMatchWordsStatsApi || {};

(function () {
  function adminTelegramId() {
    const websiteUser = window.WebsiteAuthState?.getUser?.() || null;
    return window.getTelegramId?.() || websiteUser?.telegram_id || "";
  }

  AdminMatchWordsStatsApi.load = function () {
    const telegramId = adminTelegramId();
    if (!telegramId) throw new Error("telegram_id_required");
    return apiGet(`/admin/match-words/stats?telegram_id=${encodeURIComponent(telegramId)}`);
  };
})();
