window.WebsiteProfileSheet = window.WebsiteProfileSheet || {};

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

  function close() {
    document.getElementById("website-profile-backdrop")?.remove();
    document.body.classList.remove("website-profile-open");
  }

  function renderLoading() {
    return `
      <div class="website-profile-card">
        <div class="website-profile-handle"></div>
        <div class="website-profile-loading">Loading profile...</div>
      </div>
    `;
  }

  function renderProfile(me) {
    const fullName = escapeHtml(window.SharedUser?.getFullName(me) || "Profile");
    const photoUrl = String(me?.photo_url || "").trim();
    const vCoins = window.SharedUser?.getBalance(me) || 0;
    const lastScore = escapeHtml(window.SharedUser?.getLastScore(me) || "-");
    const lastActivityHtml = window.ProfileUI?.renderLastActivity(me?.last_activity) || "";

    return `
      <div class="website-profile-card" role="dialog" aria-modal="true" aria-label="Profile">
        <div class="website-profile-handle" data-profile-close="1"></div>
        <div class="website-profile-head">
          <div class="website-profile-avatar" aria-hidden="true">
            ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="">` : `
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
                <path d="M5 19.2c1.5-3 4-4.7 7-4.7s5.5 1.7 7 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              </svg>
            `}
          </div>
          <div class="website-profile-title-group">
            <h2>${fullName}</h2>
            <span>Beginner</span>
          </div>
          <button class="website-profile-close" data-profile-close="1" aria-label="Close profile">Close</button>
        </div>

        <div class="website-profile-stats">
          <div>Level <strong>Beginner</strong></div>
          <div>V-Coins <strong>${vCoins}</strong></div>
          <div>Last score <strong>${lastScore}</strong></div>
        </div>

        <button class="website-profile-wallet" data-vcoin-open="1">
          <span class="website-profile-wallet-icon">
            <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true">
          </span>
          <span>
            <strong>Wallet</strong>
            <small>${vCoins} V-Coins available</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>

        <button class="website-profile-edit" id="website-profile-edit">Edit profile</button>
        <button class="website-profile-logout" id="website-profile-logout">Log out</button>

        <div class="website-profile-activity">
          ${lastActivityHtml}
        </div>
      </div>
    `;
  }

  window.WebsiteProfileSheet.close = close;

  window.WebsiteProfileSheet.open = async function () {
    if (!window.WebsiteAuthState?.isAuthenticated?.()) {
      window.WebsiteAuthModal?.open("login");
      return;
    }
    close();

    const backdrop = document.createElement("div");
    backdrop.id = "website-profile-backdrop";
    backdrop.className = "website-profile-backdrop";
    backdrop.innerHTML = renderLoading();
    document.body.appendChild(backdrop);
    document.body.classList.add("website-profile-open");

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-profile-close='1']")) {
        close();
      }
    });

    try {
      const me = window.WebsiteAuthState.getUser() || await window.SharedUser.loadMe();
      backdrop.innerHTML = renderProfile(me || {});
      document.getElementById("website-profile-logout")?.addEventListener("click", async () => {
        await window.WebsiteAuthState.logout();
        close();
      });
      document.getElementById("website-profile-edit")?.addEventListener("click", () => {
        window.WebsiteProfileEditor?.open(me || {});
      });
    } catch (error) {
      console.error("Website profile load failed", error);
      backdrop.innerHTML = `
        <div class="website-profile-card">
          <div class="website-profile-handle" data-profile-close="1"></div>
          <h2>Profile</h2>
          <p class="website-profile-error">Could not load profile.</p>
          <button class="website-profile-close" data-profile-close="1">Close</button>
        </div>
      `;
    }
  };
})();
