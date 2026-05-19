window.AdminFeedbackApi = window.AdminFeedbackApi || {};

(function () {
  function telegramId() {
    return window.getTelegramId?.() || window.WebsiteAuthState?.getUser?.()?.telegram_id || "";
  }

  AdminFeedbackApi.load = function () {
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiGet(`/feedback/admin?telegram_id=${encodeURIComponent(id)}`);
  };
})();
