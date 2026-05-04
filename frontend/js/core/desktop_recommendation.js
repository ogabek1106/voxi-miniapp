window.DesktopRecommendation = window.DesktopRecommendation || {};

(function () {
  const SESSION_KEY = "voxi_desktop_recommendation_seen";

  function isMiniApp() {
    return Boolean(window.AppViewMode?.isMiniApp?.());
  }

  function isMobileBrowser() {
    return Boolean(window.MobileBrowserView?.isActive?.());
  }

  function shouldShow() {
    return isMiniApp() || isMobileBrowser();
  }

  function wasSeen() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (_) {
      return Boolean(window.DesktopRecommendation.__seen);
    }
  }

  function markSeen() {
    window.DesktopRecommendation.__seen = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (_) {}
  }

  function ensureStyles() {
    if (document.getElementById("desktop-recommendation-styles")) return;

    const style = document.createElement("style");
    style.id = "desktop-recommendation-styles";
    style.textContent = `
      .desktop-recommendation-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(23, 33, 43, 0.36);
        box-sizing: border-box;
      }

      .desktop-recommendation-card {
        width: min(360px, 100%);
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 22px 60px rgba(20, 40, 60, 0.22);
        padding: 22px 18px 18px;
        box-sizing: border-box;
        text-align: center;
      }

      .desktop-recommendation-title {
        margin: 0 0 10px;
        color: #17212B;
        font-size: 22px;
        line-height: 1.18;
        font-weight: 900;
      }

      .desktop-recommendation-text {
        margin: 0 0 18px;
        color: #607080;
        font-size: 15px;
        line-height: 1.45;
        font-weight: 800;
      }

      .desktop-recommendation-ok {
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: 16px;
        background: #00BAFF;
        color: #ffffff;
        font-size: 16px;
        font-weight: 900;
        box-shadow: 0 12px 28px rgba(0, 186, 255, 0.28);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function show() {
    if (!shouldShow() || wasSeen()) return;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.className = "desktop-recommendation-overlay";
    overlay.innerHTML = `
      <div class="desktop-recommendation-card" role="dialog" aria-modal="true" aria-labelledby="desktop-recommendation-title">
        <h2 id="desktop-recommendation-title" class="desktop-recommendation-title">Best experience on desktop 💻</h2>
        <p class="desktop-recommendation-text">
          For the full IELTS mock test experience, we recommend using a desktop browser. You can still continue here.
        </p>
        <button type="button" class="desktop-recommendation-ok">OK</button>
      </div>
    `;

    overlay.querySelector(".desktop-recommendation-ok")?.addEventListener("click", () => {
      markSeen();
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  window.DesktopRecommendation.show = show;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", show);
  } else {
    show();
  }
})();
