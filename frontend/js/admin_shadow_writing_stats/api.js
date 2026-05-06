window.AdminShadowWritingStatsApi = window.AdminShadowWritingStatsApi || {};

(function () {
  AdminShadowWritingStatsApi.load = function () {
    const telegramId = window.getTelegramId?.();
    if (!telegramId) throw new Error("telegram_id_required");
    return apiGet(`/admin/shadow-writing/stats?telegram_id=${encodeURIComponent(telegramId)}`);
  };
})();
