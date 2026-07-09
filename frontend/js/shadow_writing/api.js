window.ShadowWritingApi = window.ShadowWritingApi || {};

(function () {
  async function ensureWebsiteAuthReady() {
    if (!window.AppViewMode?.isWebsite?.()) return;
    if (window.WebsiteAuthState?.hasInitialized?.()) return;
    if (typeof window.WebsiteAuthState?.load !== "function") return;
    await window.WebsiteAuthState.load();
  }

  function telegramId() {
    if (window.AppViewMode?.isWebsite?.()) {
      const websiteUser = window.WebsiteAuthState?.getUser?.();
      return websiteUser?.telegram_id || websiteUser?.id || null;
    }
    return window.getTelegramId?.() || null;
  }

  ShadowWritingApi.isGuest = function () {
    return !telegramId();
  };

  ShadowWritingApi.resolveIsGuest = async function () {
    await ensureWebsiteAuthReady();
    return ShadowWritingApi.isGuest();
  };

  ShadowWritingApi.getNext = async function () {
    await ensureWebsiteAuthReady();
    const id = telegramId();
    const suffix = id ? `?telegram_id=${encodeURIComponent(id)}` : "";
    return apiGet(`/shadow-writing/next${suffix}`);
  };

  ShadowWritingApi.completeAttempt = async function (payload) {
    await ensureWebsiteAuthReady();
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiPost("/shadow-writing/attempts", {
      telegram_id: id,
      ...payload,
    });
  };

  ShadowWritingApi.history = async function () {
    await ensureWebsiteAuthReady();
    const id = telegramId();
    if (!id) throw new Error("telegram_id_required");
    return apiGet(`/shadow-writing/history?telegram_id=${encodeURIComponent(id)}`);
  };
})();
