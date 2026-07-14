window.AdminTransactionsLoader = window.AdminTransactionsLoader || {};

(function () {
  function readFiltersFromForm() {
    const form = document.getElementById("admin-transactions-filters");
    if (!form) return AdminTransactionsState.get().filters;
    const data = new FormData(form);
    const filters = {};
    for (const [key, value] of data.entries()) {
      filters[key] = value;
    }
    ["fulfilled_only", "failed_only", "cancelled_only", "expired_only"].forEach((key) => {
      filters[key] = form.elements[key]?.checked ? "true" : "";
    });
    filters.page = 1;
    return filters;
  }

  async function load() {
    const filters = AdminTransactionsState.get().filters;
    const [list, summary] = await Promise.all([
      AdminTransactionsApi.list(filters),
      AdminTransactionsApi.summary(filters)
    ]);
    AdminTransactionsState.set({
      items: Array.isArray(list?.items) ? list.items : [],
      pagination: list?.pagination || {},
      summary: summary?.summary || {}
    });
  }

  function bind() {
    document.getElementById("admin-transactions-filters")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      AdminTransactionsState.set({ filters: readFiltersFromForm() });
      await AdminTransactionsLoader.refresh();
    });

    document.querySelector("[data-action='clear']")?.addEventListener("click", async () => {
      AdminTransactionsState.resetFilters();
      await AdminTransactionsLoader.refresh();
    });

    document.querySelector("[data-action='refresh']")?.addEventListener("click", () => AdminTransactionsLoader.refresh());

    document.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", async () => {
        AdminTransactionsState.set({ filters: { page: Number(button.dataset.page || 1) } });
        await AdminTransactionsLoader.refresh();
      });
    });

    document.querySelectorAll("[data-detail]").forEach((button) => {
      button.addEventListener("click", async () => {
        await AdminTransactionsLoader.openDetail(button.dataset.detail);
      });
    });

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const value = button.dataset.copy || "";
        try {
          await navigator.clipboard?.writeText(value);
          button.textContent = "Copied";
          window.setTimeout(() => { button.textContent = value; }, 900);
        } catch (_) {}
      });
    });
  }

  AdminTransactionsLoader.refresh = async function () {
    try {
      await load();
      AdminTransactionsUI.render();
      bind();
    } catch (error) {
      console.error("Transactions refresh failed:", error);
      AdminTransactionsUI.renderError(error?.message || "Failed to load transactions.");
    }
  };

  AdminTransactionsLoader.show = async function () {
    AdminTransactionsUI.renderLoading();
    await AdminTransactionsLoader.refresh();
  };

  AdminTransactionsLoader.openDetail = async function (orderRef) {
    try {
      const detail = await AdminTransactionsApi.detail(orderRef);
      AdminTransactionsUI.renderDetail(detail);
      document.querySelectorAll("[data-close-detail]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target !== node && event.currentTarget.classList.contains("admin-transactions-drawer-backdrop")) return;
          document.getElementById("admin-transactions-detail-root").innerHTML = "";
        });
      });
    } catch (error) {
      alert(`Could not load transaction detail: ${error?.message || "not found"}`);
    }
  };
})();

window.showAdminTransactions = function () {
  AdminTransactionsLoader.show();
};
