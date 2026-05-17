window.AdminVCoinPaymentsUI = window.AdminVCoinPaymentsUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "No expiration";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No expiration";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  AdminVCoinPaymentsUI.render = function ({ settings, promos }) {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    const exchangeRate = Number(settings?.exchange_rate_uzs || 5000);
    screen.className = "container admin-vcoin-payments-host";
    screen.innerHTML = `
      <div class="admin-vcoin-page">
        <div class="admin-vcoin-head">
          <div>
            <h2>V-Coin Payments</h2>
            <p>Control exchange rate and promo codes used by website payment intents.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>

        <section class="admin-vcoin-card">
          <h3>Exchange rate</h3>
          <form id="admin-vcoin-settings-form" class="admin-vcoin-form">
            <label>1 V-Coin price in UZS
              <input name="exchange_rate_uzs" type="number" min="1" step="1" value="${exchangeRate}">
            </label>
            <button type="submit">Save rate</button>
          </form>
        </section>

        <section class="admin-vcoin-card">
          <h3>Promo codes</h3>
          <form id="admin-vcoin-promo-form" class="admin-vcoin-form admin-vcoin-promo-form">
            <label>Code<input name="code" placeholder="OGABEK" required></label>
            <label>Discount %<input name="discount_percent" type="number" min="1" max="100" required></label>
            <label>Expiration<input name="expires_at" type="datetime-local"></label>
            <label>Usage limit<input name="usage_limit" type="number" min="1" placeholder="Unlimited"></label>
            <label class="admin-vcoin-check"><input name="is_active" type="checkbox" checked> Active</label>
            <button type="submit">Save promo</button>
          </form>

          <div class="admin-vcoin-promos">
            ${Array.isArray(promos) && promos.length ? promos.map((promo) => `
              <div class="admin-vcoin-promo-row">
                <div>
                  <strong>${escape(promo.code)}</strong>
                  <p>${Number(promo.discount_percent || 0)}% off - ${promo.is_active ? "Active" : "Disabled"} - ${formatDate(promo.expires_at)}</p>
                  <span>Used: ${Number(promo.successful_uses || 0)}${promo.usage_limit ? ` / ${Number(promo.usage_limit)}` : " / unlimited"}</span>
                </div>
                <button type="button" data-disable-promo="${Number(promo.id)}">Disable</button>
              </div>
            `).join("") : `<div class="admin-vcoin-empty">No promo codes yet.</div>`}
          </div>
        </section>
      </div>
    `;
  };
})();
