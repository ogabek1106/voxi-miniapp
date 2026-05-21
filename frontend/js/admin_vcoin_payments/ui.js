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

  function renderUserAvatar(user) {
    const photo = String(user?.photo_url || "").trim();
    if (photo) {
      return `<img src="${escape(photo)}" alt="" class="admin-vcoin-user-avatar">`;
    }
    const name = String(user?.full_name || user?.email || "U").trim();
    return `<div class="admin-vcoin-user-avatar admin-vcoin-user-avatar-fallback">${escape(name.charAt(0).toUpperCase() || "U")}</div>`;
  }

  AdminVCoinPaymentsUI.render = function ({ settings, promos }) {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    const exchangeRate = Number(settings?.exchange_rate_uzs || 5000);
    const vcoinPromos = (Array.isArray(promos) ? promos : []).filter((promo) => (promo.scope || "vcoin") === "vcoin");
    const premierePromos = (Array.isArray(promos) ? promos : []).filter((promo) => promo.scope === "premiere");
    const renderPromoRows = (items) => Array.isArray(items) && items.length ? items.map((promo) => `
      <div class="admin-vcoin-promo-row">
        <div>
          <strong>${escape(promo.code)}</strong>
          <p>${Number(promo.discount_percent || 0)}% off - ${promo.is_active ? "Active" : "Disabled"} - ${formatDate(promo.expires_at)}</p>
          <span>Used: ${Number(promo.successful_uses || 0)}${promo.usage_limit ? ` / ${Number(promo.usage_limit)}` : " / unlimited"}</span>
        </div>
        <button type="button" data-disable-promo="${Number(promo.id)}">Disable</button>
      </div>
    `).join("") : `<div class="admin-vcoin-empty">No promo codes yet.</div>`;
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
          <form id="admin-vcoin-promo-form" class="admin-vcoin-form admin-vcoin-promo-form" data-promo-scope="vcoin">
            <label>Code<input name="code" placeholder="OGABEK" required></label>
            <label>Discount %<input name="discount_percent" type="number" min="1" max="100" required></label>
            <label>Expiration<input name="expires_at" type="datetime-local"></label>
            <label>Usage limit<input name="usage_limit" type="number" min="1" placeholder="Unlimited"></label>
            <label class="admin-vcoin-check"><input name="is_active" type="checkbox" checked> Active</label>
            <button type="submit">Save promo</button>
          </form>

          <div class="admin-vcoin-promos">
            ${renderPromoRows(vcoinPromos)}
          </div>
        </section>

        <section class="admin-vcoin-card">
          <h3>Premiere Promo</h3>
          <form id="admin-premiere-promo-form" class="admin-vcoin-form admin-vcoin-promo-form" data-promo-scope="premiere">
            <label>Code<input name="code" placeholder="PREMIERE25" required></label>
            <label>Discount %<input name="discount_percent" type="number" min="1" max="100" required></label>
            <label>Expiration<input name="expires_at" type="datetime-local"></label>
            <label>Usage limit<input name="usage_limit" type="number" min="1" placeholder="Unlimited"></label>
            <label class="admin-vcoin-check"><input name="is_active" type="checkbox" checked> Active</label>
            <button type="submit">Save Premiere promo</button>
          </form>

          <div class="admin-vcoin-promos">
            ${renderPromoRows(premierePromos)}
          </div>
        </section>

        <section class="admin-vcoin-card admin-vcoin-manual-card">
          <h3>Manual Balance Management</h3>
          <p class="admin-vcoin-section-note">Search a user, review their current balance, then add or remove V-Coins with a permanent audit record.</p>

          <div class="admin-vcoin-manual-grid">
            <div class="admin-vcoin-manual-search">
              <label>Search users
                <input id="admin-vcoin-user-search" type="search" placeholder="telegram_id, username, email, full name, user id">
              </label>
              <div id="admin-vcoin-user-results" class="admin-vcoin-user-results">
                <div class="admin-vcoin-empty">Type at least 2 characters to search.</div>
              </div>
            </div>

            <div id="admin-vcoin-selected-user" class="admin-vcoin-selected-user">
              <div class="admin-vcoin-empty">Select a user to manage balance.</div>
            </div>
          </div>
        </section>
      </div>
    `;
  };

  AdminVCoinPaymentsUI.renderSearchResults = function (users, statusText) {
    const host = document.getElementById("admin-vcoin-user-results");
    if (!host) return;
    if (statusText) {
      host.innerHTML = `<div class="admin-vcoin-empty">${escape(statusText)}</div>`;
      return;
    }
    if (!Array.isArray(users) || !users.length) {
      host.innerHTML = `<div class="admin-vcoin-empty">No users found.</div>`;
      return;
    }
    host.innerHTML = users.map((user) => `
      <button type="button" class="admin-vcoin-user-result" data-user-id="${Number(user.id)}">
        ${renderUserAvatar(user)}
        <span>
          <strong>${escape(user.full_name || user.email || `User #${user.id}`)}</strong>
          <small>${user.telegram_id ? `TG ${escape(user.telegram_id)}` : "No Telegram ID"}${user.email ? ` - ${escape(user.email)}` : ""}</small>
        </span>
        <b>${Number(user.v_coins || 0)} VC</b>
      </button>
    `).join("");
  };

  AdminVCoinPaymentsUI.renderSelectedUser = function (user) {
    const host = document.getElementById("admin-vcoin-selected-user");
    if (!host) return;
    if (!user) {
      host.innerHTML = `<div class="admin-vcoin-empty">Select a user to manage balance.</div>`;
      return;
    }
    host.innerHTML = `
      <div class="admin-vcoin-selected-head">
        ${renderUserAvatar(user)}
        <div>
          <strong>${escape(user.full_name || user.email || `User #${user.id}`)}</strong>
          <span>${user.username ? `@${escape(user.username)}` : "No username stored"}</span>
        </div>
      </div>
      <div class="admin-vcoin-user-meta">
        <span>User ID <b>${Number(user.id)}</b></span>
        <span>Telegram <b>${user.telegram_id ? escape(user.telegram_id) : "none"}</b></span>
        <span>Email <b>${user.email ? escape(user.email) : "none"}</b></span>
      </div>
      <div class="admin-vcoin-balance-readout">
        <span>Current balance</span>
        <strong>${Number(user.v_coins || 0)} V-Coins</strong>
      </div>

      <form id="admin-vcoin-adjustment-form" class="admin-vcoin-form admin-vcoin-adjustment-form">
        <div class="admin-vcoin-action-toggle" role="group" aria-label="Balance action">
          <label><input type="radio" name="action_type" value="add" checked> Add V-Coins</label>
          <label><input type="radio" name="action_type" value="remove"> Remove V-Coins</label>
        </div>
        <label>Amount
          <input name="amount" type="number" min="1" step="1" placeholder="20" required>
        </label>
        <label>Reason
          <select name="reason" required>
            <option value="">Choose reason</option>
            <option value="payment correction">Payment correction</option>
            <option value="refund">Refund</option>
            <option value="bonus">Bonus</option>
            <option value="compensation">Compensation</option>
            <option value="admin adjustment">Admin adjustment</option>
            <option value="abuse correction">Abuse correction</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Note
          <textarea name="note" rows="3" placeholder="Short admin note"></textarea>
        </label>
        <button type="submit">Review adjustment</button>
      </form>
      <div id="admin-vcoin-adjustment-confirm"></div>
    `;
  };

  AdminVCoinPaymentsUI.renderAdjustmentConfirm = function ({ user, actionType, amount, reason, note }) {
    const host = document.getElementById("admin-vcoin-adjustment-confirm");
    if (!host) return;
    const current = Number(user?.v_coins || 0);
    const delta = actionType === "remove" ? -Number(amount || 0) : Number(amount || 0);
    const next = current + delta;
    const verb = actionType === "remove" ? "Remove" : "Add";
    host.innerHTML = `
      <div class="admin-vcoin-confirm-box">
        <strong>${escape(verb)} ${Number(amount)} V-Coins ${actionType === "remove" ? "from" : "to"} ${escape(user?.username ? `@${user.username}` : user?.full_name || `User #${user?.id}`)}?</strong>
        <p>Balance: ${current} -> ${next}</p>
        <p>Reason: ${escape(reason)}${note ? ` - ${escape(note)}` : ""}</p>
        <div class="admin-vcoin-confirm-actions">
          <button type="button" data-confirm-manual-adjustment="1">Apply adjustment</button>
          <button type="button" data-cancel-manual-adjustment="1">Cancel</button>
        </div>
      </div>
    `;
  };
})();
