window.VoxiNotificationsApi = window.VoxiNotificationsApi || {};

(function () {
  function telegramId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  function identityPayload() {
    const id = telegramId();
    return id ? { telegram_id: id } : {};
  }

  VoxiNotificationsApi.list = function () {
    const id = telegramId();
    const query = id ? `?telegram_id=${encodeURIComponent(id)}` : "";
    return apiGet(`/notifications${query}`);
  };

  VoxiNotificationsApi.markRead = function (id) {
    return apiPost(`/notifications/${Number(id)}/read`, identityPayload());
  };

  VoxiNotificationsApi.markAllRead = function () {
    return apiPost("/notifications/read-all", identityPayload());
  };
})();
