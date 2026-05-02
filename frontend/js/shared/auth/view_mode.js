window.AppViewMode = window.AppViewMode || {};

(function () {
  function isTelegramMiniApp() {
    const webApp = window.Telegram?.WebApp;
    return Boolean(webApp && (webApp.initData || webApp.initDataUnsafe?.user?.id));
  }

  window.AppViewMode.isMiniApp = isTelegramMiniApp;
  window.AppViewMode.isWebsite = function () {
    return !isTelegramMiniApp();
  };

  window.AppViewMode.current = function () {
    return isTelegramMiniApp() ? "miniapp" : "website";
  };

  document.documentElement.dataset.viewMode = window.AppViewMode.current();
  console.log("[ViewMode]", window.AppViewMode.current());

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.viewMode = window.AppViewMode.current();
    document.body.classList.toggle("view-miniapp", window.AppViewMode.isMiniApp());
    document.body.classList.toggle("view-website", window.AppViewMode.isWebsite());
  });
})();
