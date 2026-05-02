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

    const home = document.getElementById("screen-home");
    if (home) home.style.display = "none";

    const adminActions = document.querySelector("#screen-home .home-admin-actions");
    if (adminActions) adminActions.style.display = "none";
  }

  function ensureWebsiteHome() {
    let root = document.getElementById("website-home");
    if (root) return root;

    const content = document.getElementById("content");
    if (!content) return null;

    root = document.createElement("div");
    root.id = "website-home";
    root.className = "website-home";
    root.innerHTML = `
      <p class="website-home-kicker">IELTS practice platform</p>
      <h1 class="website-home-title">Prepare with focused mock practice.</h1>
      <p class="website-home-subtitle">Choose a section or enter a full mock test. Your wallet and profile stay available in the website header.</p>

      <div class="website-home-grid">
        <button class="website-course-card" onclick="showMocksEntry()">
          <span class="website-course-icon" aria-hidden="true">M</span>
          <span><strong>IELTS Mock Tests</strong><span>Full exam simulation</span></span>
          <span class="website-course-arrow" aria-hidden="true">›</span>
        </button>
        <button class="website-course-card" onclick="showReadingEntry()">
          <span class="website-course-icon" aria-hidden="true">R</span>
          <span><strong>Reading</strong><span>Academic reading practice</span></span>
          <span class="website-course-arrow" aria-hidden="true">›</span>
        </button>
        <button class="website-course-card" onclick="showListeningEntry()">
          <span class="website-course-icon" aria-hidden="true">L</span>
          <span><strong>Listening</strong><span>Audio-based practice</span></span>
          <span class="website-course-arrow" aria-hidden="true">›</span>
        </button>
        <button class="website-course-card" onclick="showWritingEntry()">
          <span class="website-course-icon" aria-hidden="true">W</span>
          <span><strong>Writing</strong><span>Task practice and feedback</span></span>
          <span class="website-course-arrow" aria-hidden="true">›</span>
        </button>
        <button class="website-course-card" onclick="showSpeakingEntry()">
          <span class="website-course-icon" aria-hidden="true">S</span>
          <span><strong>Speaking</strong><span>Speaking test practice</span></span>
          <span class="website-course-arrow" aria-hidden="true">›</span>
        </button>
      </div>
    `;
    content.prepend(root);
    return root;
  }

  function hideWebsiteHome() {
    const root = document.getElementById("website-home");
    if (root) root.style.display = "none";
  }

  function showWebsiteHome() {
    if (!isWebsite()) return false;
    if (typeof window.hideAllScreens === "function") {
      window.hideAllScreens();
    }
    const announcement = document.getElementById("announcement");
    if (announcement) announcement.style.display = "none";
    hideMiniAppOnlyElements();
    const root = ensureWebsiteHome();
    if (root) root.style.display = "block";
    return true;
  }

  function wrapNavigation() {
    if (window.WebsiteLayout._navigationWrapped) return;
    window.WebsiteLayout._navigationWrapped = true;

    const miniGoHome = window.goHome;
    window.goHome = function () {
      if (showWebsiteHome()) return;
      if (typeof miniGoHome === "function") miniGoHome();
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
        hideWebsiteHome();
        return original.apply(this, args);
      };
    });
  }

  window.WebsiteLayout.init = function () {
    if (!isWebsite()) return;

    document.body.classList.add("view-website");
    document.body.classList.remove("view-miniapp");
    window.WebsiteHeader?.mount();
    ensureWebsiteHome();
    wrapNavigation();
    hideMiniAppOnlyElements();
    showWebsiteHome();

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
