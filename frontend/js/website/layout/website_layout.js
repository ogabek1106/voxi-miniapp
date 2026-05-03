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

    updateWebsiteAdminState(window.WebsiteAuthState?.getUser?.() || null);

    const adminScreen = document.getElementById("screen-admin");
    if (adminScreen) adminScreen.style.display = "none";
  }

  function removeWebsiteHome() {
    document.getElementById("website-home")?.remove();
  }

  function showHomeFooter() {
    window.WebsiteFooter?.mount?.();
  }

  function hideHomeFooter() {
    window.WebsiteFooter?.unmount?.();
  }

  function restoreWebsiteContentSpacing() {
    const content = document.getElementById("content");
    if (!content) return;
    content.style.removeProperty("padding");
  }

  function updateWebsiteAdminState(user) {
    if (!isWebsite()) return;
    const isAdmin = Boolean(user?.is_admin);
    window.__isAdmin = isAdmin;

    const adminBtn = document.getElementById("adminBtn");
    if (adminBtn) adminBtn.style.display = isAdmin ? "block" : "none";

    const adminActions = document.querySelector("#screen-home .home-admin-actions");
    if (adminActions) adminActions.style.display = isAdmin ? "flex" : "none";
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
      restoreWebsiteContentSpacing();
      hideMiniAppOnlyElements();
      showHomeFooter();
      document.querySelector(".app")?.scrollTo({ top: 0, behavior: "auto" });
      window.WebsiteHeader?.updateScrollState?.();
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
        hideHomeFooter();
        const result = original.apply(this, args);
        if (name === "showMocksScreen" || name === "goProfile") {
          restoreWebsiteContentSpacing();
        }
        window.WebsiteHeader?.updateScrollState?.();
        return result;
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
    showHomeFooter();

    window.WebsiteAuthState?.load?.()
      .then((user) => {
        updateWebsiteAdminState(user);
        window.WebsiteHeader?.render?.();
      })
      .catch((error) => console.error("Website user load failed", error));

    window.WebsiteAuthState?.subscribe?.((user) => {
      updateWebsiteAdminState(user);
    });

    if (typeof window.refreshVcoinBalance === "function") {
      window.refreshVcoinBalance({ animate: false });
    }
  };
})();
