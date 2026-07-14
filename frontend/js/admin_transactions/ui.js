window.AdminTransactionsUI = window.AdminTransactionsUI || {};

(function () {
  AdminTransactionsUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminTransactionsUI.formatMoney = function (value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })} UZS`;
  };

  AdminTransactionsUI.formatDate = function (value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  AdminTransactionsUI.formatDuration = function (seconds) {
    if (seconds === null || seconds === undefined) return "-";
    const total = Math.max(0, Number(seconds || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  function screen() {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const host = document.getElementById("screen-mocks");
    if (host) {
      host.className = "container admin-transactions-host";
      host.style.display = "block";
    }
    return host;
  }

  AdminTransactionsUI.renderLoading = function () {
    const host = screen();
    if (!host) return;
    host.innerHTML = `
      <div class="admin-transactions-screen">
        <div class="admin-transactions-head">
          <div><h2>Transactions</h2><p>Loading payment history...</p></div>
          <button class="admin-transactions-secondary" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-transactions-empty"><strong>Loading transactions.</strong><span>Please wait.</span></div>
      </div>
    `;
  };

  AdminTransactionsUI.renderError = function (message) {
    const host = screen();
    if (!host) return;
    host.innerHTML = `
      <div class="admin-transactions-screen">
        <div class="admin-transactions-head">
          <div><h2>Transactions</h2><p>Payment history and provider events.</p></div>
          <button class="admin-transactions-secondary" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-transactions-empty admin-transactions-empty--error">
          <strong>Could not load transactions.</strong>
          <span>${AdminTransactionsUI.escape(message || "Please try again.")}</span>
        </div>
      </div>
    `;
  };

  AdminTransactionsUI.render = function () {
    const host = screen();
    if (!host) return;
    const state = AdminTransactionsState.get();
    host.innerHTML = `
      <div class="admin-transactions-screen">
        <div class="admin-transactions-head">
          <div>
            <h2>Transactions</h2>
            <p>Unified payment orders, provider transactions, manual requests, and fulfillment evidence.</p>
          </div>
          <div class="admin-transactions-head-actions">
            <button class="admin-transactions-secondary" data-action="refresh">Refresh</button>
            <button class="admin-transactions-secondary" onclick="showAdminPanel()">Back</button>
          </div>
        </div>
        ${renderSummary(state.summary)}
        ${renderFilters(state.filters)}
        ${AdminTransactionsTable.render(state.items)}
        ${renderPagination(state.pagination, state.filters)}
      </div>
      <div id="admin-transactions-detail-root"></div>
    `;
  };

  function renderSummary(summary = {}) {
    const cards = [
      ["Total transactions", summary.total_count || 0],
      ["Online revenue", AdminTransactionsUI.formatMoney((summary.successful_revenue_tiyin || 0) / 100)],
      ["Pending online amount", AdminTransactionsUI.formatMoney((summary.pending_amount_tiyin || 0) / 100)],
      ["Failed / cancelled", summary.failed_cancelled_count || 0],
      ["Fulfilled", summary.fulfilled_count || 0],
      ["Click revenue", AdminTransactionsUI.formatMoney((summary.click_revenue_tiyin || 0) / 100)],
      ["Payme revenue", AdminTransactionsUI.formatMoney((summary.payme_revenue_tiyin || 0) / 100)],
      ["Manual approved value", AdminTransactionsUI.formatMoney((summary.manual_revenue_tiyin || 0) / 100)],
      ["V-Coin sales", AdminTransactionsUI.formatMoney((summary.vcoin_sales_tiyin || 0) / 100)],
      ["Other product sales", AdminTransactionsUI.formatMoney((summary.other_product_sales_tiyin || 0) / 100)],
      ["Today paid", AdminTransactionsUI.formatMoney((summary.today_successful_revenue_tiyin || 0) / 100)],
      ["Last 30 days paid", AdminTransactionsUI.formatMoney((summary.last_30_days_successful_revenue_tiyin || 0) / 100)]
    ];
    return `<section class="admin-transactions-summary">${cards.map(([label, value]) => `
      <article><span>${AdminTransactionsUI.escape(label)}</span><strong>${AdminTransactionsUI.escape(value)}</strong></article>
    `).join("")}</section>`;
  }

  function renderFilters(filters) {
    const f = (key) => AdminTransactionsUI.escape(filters[key] || "");
    return `
      <form class="admin-transactions-filters" id="admin-transactions-filters">
        ${input("q", "Search", f("q"), "Order, user, tx id")}
        ${input("order_ref", "Order ref", f("order_ref"))}
        ${select("provider", "Provider", f("provider"), ["", "click", "payme", "manual"])}
        ${select("product_type", "Product", f("product_type"), ["", "vcoin", "premiere", "donation", "course", "mock", "unknown"])}
        ${select("order_status", "Order status", f("order_status"), ["", "pending", "paid", "fulfilled", "cancelled", "expired", "fulfillment_failed", "admin_confirmed", "admin_rejected", "duplicate_suspected"])}
        ${select("fulfillment_status", "Fulfillment", f("fulfillment_status"), ["", "not_started", "processing", "fulfilled", "failed"])}
        ${input("provider_state", "Provider state", f("provider_state"))}
        ${input("filter_telegram_id", "Telegram ID", f("filter_telegram_id"), "", "number")}
        ${input("user_id", "User ID", f("user_id"), "", "number")}
        ${input("amount_min", "Amount min UZS", f("amount_min"), "", "number")}
        ${input("amount_max", "Amount max UZS", f("amount_max"), "", "number")}
        ${input("created_from", "Created from", f("created_from"), "", "datetime-local")}
        ${input("created_to", "Created to", f("created_to"), "", "datetime-local")}
        ${input("paid_from", "Paid from", f("paid_from"), "", "datetime-local")}
        ${input("paid_to", "Paid to", f("paid_to"), "", "datetime-local")}
        ${select("sort_by", "Sort", f("sort_by"), ["created_at", "paid_at", "fulfilled_at", "amount", "provider", "product_type", "order_status"])}
        ${select("sort_dir", "Direction", f("sort_dir"), ["desc", "asc"])}
        ${select("page_size", "Page size", f("page_size"), ["25", "50", "100"])}
        <label class="admin-transactions-check"><input type="checkbox" name="fulfilled_only" ${filters.fulfilled_only ? "checked" : ""}> Fulfilled only</label>
        <label class="admin-transactions-check"><input type="checkbox" name="failed_only" ${filters.failed_only ? "checked" : ""}> Failed only</label>
        <label class="admin-transactions-check"><input type="checkbox" name="cancelled_only" ${filters.cancelled_only ? "checked" : ""}> Cancelled only</label>
        <label class="admin-transactions-check"><input type="checkbox" name="expired_only" ${filters.expired_only ? "checked" : ""}> Expired only</label>
        <div class="admin-transactions-filter-actions">
          <button type="submit">Apply filters</button>
          <button type="button" data-action="clear">Clear filters</button>
        </div>
      </form>
    `;
  }

  function input(name, label, value, placeholder = "", type = "text") {
    return `<label>${label}<input name="${name}" type="${type}" value="${value}" placeholder="${AdminTransactionsUI.escape(placeholder)}"></label>`;
  }

  function select(name, label, value, options) {
    return `<label>${label}<select name="${name}">${options.map((option) => `
      <option value="${AdminTransactionsUI.escape(option)}" ${String(option) === String(value) ? "selected" : ""}>${AdminTransactionsUI.escape(option || "Any")}</option>
    `).join("")}</select></label>`;
  }

  function renderPagination(pagination, filters) {
    const page = Number(pagination?.page || 1);
    const totalPages = Number(pagination?.total_pages || 0);
    return `
      <div class="admin-transactions-pagination">
        <span>${Number(pagination?.total || 0).toLocaleString()} results · page ${page} of ${totalPages || 1}</span>
        <div>
          <button data-page="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>Previous</button>
          <button data-page="${page + 1}" ${totalPages && page >= totalPages ? "disabled" : ""}>Next</button>
        </div>
      </div>
    `;
  }

  AdminTransactionsUI.renderDetail = function (data) {
    const root = document.getElementById("admin-transactions-detail-root");
    if (!root) return;
    const tx = data?.transaction || {};
    const detail = data?.detail || {};
    root.innerHTML = `
      <div class="admin-transactions-drawer-backdrop" data-close-detail="1">
        <aside class="admin-transactions-drawer" role="dialog" aria-modal="true">
          <header>
            <div><h3>${AdminTransactionsUI.escape(tx.order_ref || "Transaction")}</h3><p>${AdminTransactionsUI.escape(tx.provider || "-")} · ${AdminTransactionsUI.escape(tx.product_description || "-")}</p></div>
            <button data-close-detail="1">Close</button>
          </header>
          <div class="admin-transactions-detail-grid">
            ${detailBlock("Order", detail.order || tx)}
            ${detailBlock("User", detail.user)}
            ${detailBlock("Provider transaction", detail.provider_transaction)}
            ${detailBlock("Fulfillment", detail.fulfillment)}
            ${detailBlock("Raw data", detail.raw_data, true)}
          </div>
        </aside>
      </div>
    `;
  };

  function detailBlock(title, value, raw) {
    if (!value) {
      return `<section class="admin-transactions-detail-block"><h4>${AdminTransactionsUI.escape(title)}</h4><div class="admin-transactions-muted">No data.</div></section>`;
    }
    const json = JSON.stringify(value, null, 2);
    return `
      <section class="admin-transactions-detail-block ${raw ? "admin-transactions-detail-block--raw" : ""}">
        <h4>${AdminTransactionsUI.escape(title)}</h4>
        <pre>${AdminTransactionsUI.escape(json)}</pre>
      </section>
    `;
  }
})();
