window.AdminTransactionsTable = window.AdminTransactionsTable || {};

(function () {
  function esc(value) {
    return window.AdminTransactionsUI.escape(value ?? "-");
  }

  function status(value, group) {
    const raw = String(value || "unknown").toLowerCase();
    const tone = raw.includes("fulfill") || raw.includes("perform") || raw.includes("complete") || raw === "paid" || raw === "admin_confirmed"
      ? "good"
      : raw.includes("cancel") || raw.includes("fail") || raw.includes("reject") || raw.includes("expired")
        ? "bad"
        : raw.includes("pending") || raw.includes("created") || raw.includes("prepared")
          ? "wait"
          : "neutral";
    return `<span class="admin-transactions-badge admin-transactions-badge--${tone}">${esc(group ? `${group}: ${value || "unknown"}` : value || "unknown")}</span>`;
  }

  AdminTransactionsTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-transactions-empty">
          <strong>No matching transactions.</strong>
          <span>Adjust filters or clear them to see payment history.</span>
        </div>
      `;
    }

    return `
      <div class="admin-transactions-table-card">
        <div class="admin-transactions-table-scroll">
          <table class="admin-transactions-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Ref</th>
                <th>Provider</th>
                <th>Product</th>
                <th>User</th>
                <th>Telegram</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Order Status</th>
                <th>Fulfillment</th>
                <th>Provider State</th>
                <th>Provider Tx</th>
                <th>Created</th>
                <th>Paid</th>
                <th>Fulfilled</th>
                <th>Cancelled</th>
                <th>Expires</th>
                <th>Duration</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${items.map(renderRow).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  function renderRow(item) {
    const user = item.user || {};
    const tx = item.provider_transaction_id || "-";
    return `
      <tr data-transaction-row="${esc(item.order_ref)}">
        <td>${esc(item.order_id || item.manual_payment_id || "-")}</td>
        <td><button class="admin-transactions-link" data-copy="${esc(item.order_ref)}">${esc(item.order_ref)}</button></td>
        <td>${esc(item.provider)}</td>
        <td><strong>${esc(item.product_type)}</strong><small>${esc(item.product_description)}</small></td>
        <td>${esc(user.display_name || user.username || user.id || "-")}</td>
        <td>${esc(user.telegram_id || "-")}</td>
        <td>${esc(user.email || "-")}</td>
        <td>${esc(AdminTransactionsUI.formatMoney(item.amount?.uzs))}</td>
        <td>${status(item.order_status)}</td>
        <td>${status(item.fulfillment_status)}</td>
        <td>${status(item.provider_state || "-", item.provider)}</td>
        <td><button class="admin-transactions-link" data-copy="${esc(tx)}">${esc(tx)}</button></td>
        <td>${esc(AdminTransactionsUI.formatDate(item.created_at))}</td>
        <td>${esc(AdminTransactionsUI.formatDate(item.paid_at))}</td>
        <td>${esc(AdminTransactionsUI.formatDate(item.fulfilled_at))}</td>
        <td>${esc(AdminTransactionsUI.formatDate(item.cancelled_at))}</td>
        <td>${esc(AdminTransactionsUI.formatDate(item.expires_at))}</td>
        <td>${esc(AdminTransactionsUI.formatDuration(item.payment_age_seconds))}</td>
        <td>${esc(item.source || "-")}</td>
        <td><button class="admin-transactions-detail-btn" data-detail="${esc(item.order_ref)}">Details</button></td>
      </tr>
    `;
  }
})();
