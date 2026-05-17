window.AdminVCoinPaymentsLoader = window.AdminVCoinPaymentsLoader || {};

(function () {
  async function load() {
    const [settings, promos] = await Promise.all([
      AdminVCoinPaymentsApi.getSettings(),
      AdminVCoinPaymentsApi.listPromos()
    ]);
    return {
      settings,
      promos: Array.isArray(promos?.promo_codes) ? promos.promo_codes : []
    };
  }

  function toIsoOrNull(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function bind() {
    document.getElementById("admin-vcoin-settings-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.exchange_rate_uzs;
      await AdminVCoinPaymentsApi.saveSettings(Number(input.value || 0));
      await AdminVCoinPaymentsLoader.show();
    });

    document.getElementById("admin-vcoin-promo-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      await AdminVCoinPaymentsApi.savePromo({
        code: data.get("code"),
        discount_percent: Number(data.get("discount_percent") || 0),
        expires_at: toIsoOrNull(data.get("expires_at")),
        usage_limit: Number(data.get("usage_limit") || 0) || null,
        is_active: data.get("is_active") === "on"
      });
      await AdminVCoinPaymentsLoader.show();
    });

    document.querySelectorAll("[data-disable-promo]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        await AdminVCoinPaymentsApi.disablePromo(Number(button.dataset.disablePromo));
        await AdminVCoinPaymentsLoader.show();
      });
    });
  }

  AdminVCoinPaymentsLoader.show = async function () {
    hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    try {
      const data = await load();
      AdminVCoinPaymentsUI.render(data);
      bind();
    } catch (error) {
      console.error("V-Coin payment admin load failed:", error);
      if (screen) {
        screen.innerHTML = `<div class="admin-vcoin-page"><div class="admin-vcoin-card">Could not load payment settings.<br><button onclick="showAdminPanel()">Back</button></div></div>`;
      }
    }
  };
})();

window.showAdminVCoinPayments = function () {
  AdminVCoinPaymentsLoader.show();
};
