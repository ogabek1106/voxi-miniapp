window.AppViewMode = window.AppViewMode || {};

(function () {
  function isTelegramMiniApp() {
    return Boolean(window.Telegram?.WebApp);
  }

  window.AppViewMode.isMiniApp = isTelegramMiniApp;
  window.AppViewMode.isWebsite = function () {
    return !isTelegramMiniApp();
  };

  window.AppViewMode.current = function () {
    return isTelegramMiniApp() ? "miniapp" : "website";
  };

  document.documentElement.dataset.viewMode = window.AppViewMode.current();

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.toggle("view-miniapp", window.AppViewMode.isMiniApp());
    document.body.classList.toggle("view-website", window.AppViewMode.isWebsite());
  });
})();
