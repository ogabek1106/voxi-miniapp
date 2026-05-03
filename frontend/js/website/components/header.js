window.WebsiteHeader = window.WebsiteHeader || {};

(function () {
  function escapeHtml(value) {
    if (window.ProfileUI?.escapeHtml) return window.ProfileUI.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.WebsiteHeader.mount = function () {
    if (document.getElementById("website-header")) return;

    const app = document.querySelector(".app");
    if (!app) return;

    const header = document.createElement("header");
    header.id = "website-header";
    header.className = "website-header";
    header.innerHTML = `
      <div class="website-brand" aria-label="EBAI Academy">
        <img class="website-brand-logo" src="./assets/ebai-header-logo.png" alt="">
        <span class="website-brand-text">EBAI Academy</span>
      </div>

      <div class="website-header-actions">
        <button class="website-balance-button" data-vcoin-open="1" aria-label="Open V-Coin balance">
          <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true">
          <span id="website-balance-value">0</span>
        </button>
        <button class="website-profile-button" id="website-profile-button" aria-label="Open profile">
          <span class="website-profile-button-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
              <path d="M5 19.2c1.5-3 4-4.7 7-4.7s5.5 1.7 7 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          </span>
          <span id="website-profile-name">Profile</span>
        </button>
      </div>
    `;

    app.prepend(header);
    document.getElementById("website-profile-button")?.addEventListener("click", () => {
      if (window.WebsiteAuthState?.isAuthenticated?.()) {
        window.WebsiteProfileSheet?.open();
      }
    });
    window.WebsiteAuthState?.subscribe?.(() => window.WebsiteHeader.render());
    window.WebsiteHeader.render();
  };

  window.WebsiteHeader.render = function () {
    const actions = document.querySelector("#website-header .website-header-actions");
    if (!actions) return;
    const user = window.WebsiteAuthState?.getUser?.();

    if (!user) {
      actions.innerHTML = `
        <button class="website-auth-link" id="website-signup-btn">Sign Up</button>
        <button class="website-auth-link" id="website-login-btn">Log In</button>
      `;
      document.getElementById("website-signup-btn")?.addEventListener("click", () => window.WebsiteAuthModal?.open("signup"));
      document.getElementById("website-login-btn")?.addEventListener("click", () => window.WebsiteAuthModal?.open("login"));
      return;
    }

    actions.innerHTML = `
      <button class="website-balance-button" data-vcoin-open="1" aria-label="Open V-Coin balance">
        <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true">
        <span id="website-balance-value">${window.SharedUser?.getBalance(user) || 0}</span>
      </button>
      <button class="website-profile-button" id="website-profile-button" aria-label="Open profile">
        <span class="website-profile-button-avatar" aria-hidden="true">
          ${user.photo_url ? `<img src="${escapeHtml(user.photo_url)}" alt="">` : `
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
              <path d="M5 19.2c1.5-3 4-4.7 7-4.7s5.5 1.7 7 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          `}
        </span>
        <span id="website-profile-name">${escapeHtml(window.SharedUser?.getFullName(user) || "Profile")}</span>
      </button>
    `;
    document.getElementById("website-profile-button")?.addEventListener("click", () => window.WebsiteProfileSheet?.open());
  };

  window.WebsiteHeader.update = function (me) {
    if (window.AppViewMode?.isWebsite?.()) {
      window.WebsiteHeader.render();
      return;
    }
  };
})();
