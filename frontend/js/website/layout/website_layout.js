window.WebsiteLayout = window.WebsiteLayout || {};

(function () {
  function isWebsite() {
    return window.AppViewMode?.isWebsite ? window.AppViewMode.isWebsite() : !window.Telegram?.WebApp;
  }

  function hideMiniAppOnlyElements() {
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) bottomNav.style.display = "none";

    const homeHeader = document.querySelector("#screen-home .home-header");
    if (homeHeader) homeHeader.style.display = "none";

    const adminActions = document.querySelector("#screen-home .home-admin-actions");
    if (adminActions) adminActions.style.display = "none";

    const adminScreen = document.getElementById("screen-admin");
    if (adminScreen) adminScreen.style.display = "none";
  }

  function removeWebsiteHome() {
    document.getElementById("website-home")?.remove();
  }

  function wrapNavigation() {
    if (window.WebsiteLayout._navigationWrapped) return;
    window.WebsiteLayout._navigationWrapped = true;

    const miniGoHome = window.goHome;
    window.goHome = function () {
      if (!isWebsite()) {
        if (typeof miniGoHome === "function") miniGoHome();
        return;
      }

      removeWebsiteHome();
      if (typeof miniGoHome === "function") miniGoHome();
      hideMiniAppOnlyElements();
    };

    [
      "showMocksScreen",
      "showReadingEntry",
      "showWritingEntry",
      "showSpeakingEntry",
      "showListeningEntry",
      "goProfile"
    ].forEach((name) => {
      const original = window[name];
      if (typeof original !== "function") return;
      window[name] = function (...args) {
        removeWebsiteHome();
        return original.apply(this, args);
      };
    });
  }

  window.WebsiteLayout.init = function () {
    if (!isWebsite()) return;

    document.body.classList.add("view-website");
    document.body.classList.remove("view-miniapp");
    window.WebsiteHeader?.mount();
    wrapNavigation();
    window.goHome?.();
    hideMiniAppOnlyElements();

    window.SharedUser?.loadMe?.()
      .then((me) => window.WebsiteHeader?.update?.(me || {}))
      .catch((error) => console.error("Website user load failed", error));

    if (typeof window.refreshVcoinBalance === "function") {
      window.refreshVcoinBalance({ animate: false });
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.WebsiteLayout.init();
  });
})();
