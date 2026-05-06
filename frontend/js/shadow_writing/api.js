window.ShadowWritingApi = window.ShadowWritingApi || {};

(function () {
  function telegramId() {
    if (window.AppViewMode?.isWebsite?.()) {
      const websiteUser = window.WebsiteAuthState?.getUser?.();
      return websiteUser?.telegram_id || websiteUser?.id || null;
    }
    return window.getTelegramId?.() || null;
  }

  ShadowWritingApi.getNext = async function () {
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiGet(`/shadow-writing/next?telegram_id=${encodeURIComponent(id)}`);
  };

  ShadowWritingApi.completeAttempt = async function (payload) {
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiPost("/shadow-writing/attempts", {
      telegram_id: id,
      ...payload,
    });
  };

  ShadowWritingApi.history = async function () {
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiGet(`/shadow-writing/history?telegram_id=${encodeURIComponent(id)}`);
  };
})();
