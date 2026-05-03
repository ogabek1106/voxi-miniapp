window.MobileBrowserView = window.MobileBrowserView || {};

(function () {
  function isTelegramMiniApp() {
    const webApp = window.Telegram?.WebApp;
    return Boolean(webApp && webApp.initData);
  }

  function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !isTelegramMiniApp();
  }

  function apply() {
    const active = isMobileBrowser();
    document.documentElement.classList.toggle("mobile-browser-view", active);
    document.body?.classList.toggle("mobile-browser-view", active);
  }

  window.MobileBrowserView.isActive = isMobileBrowser;
  window.MobileBrowserView.apply = apply;

  if (document.body) {
    apply();
  } else {
    document.addEventListener("DOMContentLoaded", apply);
  }
})();
