window.AdminVCoinPaymentsLoader = window.AdminVCoinPaymentsLoader || {};

(function () {
  let selectedUser = null;
  let pendingAdjustment = null;
  let searchTimer = null;

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

    bindManualBalanceManagement();
  }

  function bindManualBalanceManagement() {
    const searchInput = document.getElementById("admin-vcoin-user-search");
    searchInput?.addEventListener("input", () => {
      const query = String(searchInput.value || "").trim();
      window.clearTimeout(searchTimer);
      if (query.length < 2) {
        AdminVCoinPaymentsUI.renderSearchResults([], "Type at least 2 characters to search.");
        return;
      }
      AdminVCoinPaymentsUI.renderSearchResults([], "Searching...");
      searchTimer = window.setTimeout(async () => {
        try {
          const data = await AdminVCoinPaymentsApi.searchUsers(query);
          AdminVCoinPaymentsUI.renderSearchResults(data?.items || []);
          bindSearchResultClicks(data?.items || []);
        } catch (error) {
          console.error("Manual balance user search failed:", error);
          AdminVCoinPaymentsUI.renderSearchResults([], "Search failed. Try again.");
        }
      }, 250);
    });
  }

  function bindSearchResultClicks(users) {
    document.querySelectorAll("[data-user-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.userId);
        selectedUser = (users || []).find((user) => Number(user.id) === id) || null;
        pendingAdjustment = null;
        AdminVCoinPaymentsUI.renderSelectedUser(selectedUser);
        bindAdjustmentForm();
      });
    });
  }

  function bindAdjustmentForm() {
    const form = document.getElementById("admin-vcoin-adjustment-form");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selectedUser) return;
      const data = new FormData(form);
      const actionType = String(data.get("action_type") || "add");
      const amount = Number(data.get("amount") || 0);
      const reason = String(data.get("reason") || "").trim();
      const note = String(data.get("note") || "").trim();
      const current = Number(selectedUser.v_coins || 0);

      if (!amount || amount <= 0) {
        renderConfirmError("Amount must be greater than 0.");
        return;
      }
      if (!reason) {
        renderConfirmError("Reason is required.");
        return;
      }
      if (actionType === "remove" && current - amount < 0) {
        renderConfirmError("Removing funds cannot create a negative balance.");
        return;
      }

      pendingAdjustment = {
        target_user_id: Number(selectedUser.id),
        action_type: actionType,
        amount,
        reason,
        note
      };
      AdminVCoinPaymentsUI.renderAdjustmentConfirm({ user: selectedUser, actionType, amount, reason, note });
      bindConfirmActions();
    });
  }

  function renderConfirmError(message) {
    const host = document.getElementById("admin-vcoin-adjustment-confirm");
    if (host) host.innerHTML = `<div class="admin-vcoin-empty admin-vcoin-error">${message}</div>`;
  }

  function bindConfirmActions() {
    document.querySelector("[data-cancel-manual-adjustment]")?.addEventListener("click", () => {
      pendingAdjustment = null;
      const host = document.getElementById("admin-vcoin-adjustment-confirm");
      if (host) host.innerHTML = "";
    });

    document.querySelector("[data-confirm-manual-adjustment]")?.addEventListener("click", async (event) => {
      if (!pendingAdjustment) return;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await AdminVCoinPaymentsApi.applyManualAdjustment(pendingAdjustment);
        selectedUser = result?.user || selectedUser;
        pendingAdjustment = null;
        AdminVCoinPaymentsUI.renderSelectedUser(selectedUser);
        bindAdjustmentForm();
      } catch (error) {
        console.error("Manual balance adjustment failed:", error);
        button.disabled = false;
        renderConfirmError("Could not apply adjustment. Check amount and reason.");
      }
    });
  }

  AdminVCoinPaymentsLoader.show = async function () {
    selectedUser = null;
    pendingAdjustment = null;
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
