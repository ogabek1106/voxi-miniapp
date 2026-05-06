window.VoxiAuthGateState = window.VoxiAuthGateState || {};

(function () {
  function getTelegramUser() {
    return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  }

  function getFallbackTelegramUser() {
    const telegramId = window.getTelegramId?.();
    return telegramId ? { telegram_id: telegramId, id: telegramId } : null;
  }

  window.VoxiAuthGateState.getCurrentUser = function () {
    if (window.AppViewMode?.isWebsite?.()) {
      return window.WebsiteAuthState?.getUser?.() || null;
    }

    return getTelegramUser() || getFallbackTelegramUser();
  };

  window.VoxiAuthGateState.isAuthenticated = function () {
    if (window.AppViewMode?.isWebsite?.()) {
      return Boolean(window.WebsiteAuthState?.isAuthenticated?.());
    }

    return Boolean(getTelegramUser() || getFallbackTelegramUser());
  };

  window.VoxiAuthGateState.onAuthChange = function (callback) {
    if (window.WebsiteAuthState?.subscribe) {
      return window.WebsiteAuthState.subscribe(() => {
        callback(window.VoxiAuthGateState.getCurrentUser());
      });
    }

    callback(window.VoxiAuthGateState.getCurrentUser());
    return function () {};
  };
})();
