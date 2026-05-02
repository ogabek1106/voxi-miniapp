window.WebsiteHeader = window.WebsiteHeader || {};

(function () {
  function escapeHtml(value) {
    if (window.ProfileUI?.escapeHtml) return window.ProfileUI.escapeHtml(value);
    return String(value ?? "");
  }

  window.WebsiteHeader.mount = function () {
    if (document.getElementById("website-header")) return;

    const app = document.querySelector(".app");
    if (!app) return;

    const header = document.createElement("header");
    header.id = "website-header";
    header.className = "website-header";
    header.innerHTML = `
      <div class="website-brand">
        <span class="website-brand-logo" aria-hidden="true">
          E
        </span>
        <span>EBAI Academy</span>
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
      window.WebsiteProfileSheet?.open();
    });
  };

  window.WebsiteHeader.update = function (me) {
    const nameEl = document.getElementById("website-profile-name");
    const balanceEl = document.getElementById("website-balance-value");
    if (nameEl) nameEl.textContent = escapeHtml(window.SharedUser?.getFullName(me) || "Profile");
    if (balanceEl) balanceEl.textContent = String(window.SharedUser?.getBalance(me) || 0);
  };
})();
