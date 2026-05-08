window.AdminVocabularyOddOneOutStatsApi = window.AdminVocabularyOddOneOutStatsApi || {};

(function () {
  AdminVocabularyOddOneOutStatsApi.load = function () {
    const telegramId = window.getTelegramId?.();
    if (!telegramId) throw new Error("telegram_id_required");
    return apiGet(`/admin/vocabulary/odd-one-out/stats?telegram_id=${encodeURIComponent(telegramId)}`);
  };
})();
