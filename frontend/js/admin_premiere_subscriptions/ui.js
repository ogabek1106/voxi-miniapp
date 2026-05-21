window.AdminPremiereSubscriptionsUI = window.AdminPremiereSubscriptionsUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderUserAvatar(user) {
    const photo = String(user?.photo_url || "").trim();
    if (photo) {
      return `<img src="${escape(photo)}" alt="" class="admin-vcoin-user-avatar">`;
    }
    const name = String(user?.full_name || user?.email || "U").trim();
    return `<div class="admin-vcoin-user-avatar admin-vcoin-user-avatar-fallback">${escape(name.charAt(0).toUpperCase() || "U")}</div>`;
  }

  function formatDate(value) {
    if (!value) return "No expiration";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No expiration";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  AdminPremiereSubscriptionsUI.render = function () {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.className = "container admin-vcoin-payments-host";
    screen.innerHTML = `
      <div class="admin-vcoin-page">
        <div class="admin-vcoin-head">
          <div>
            <h2>Premiere Subscriptions</h2>
            <p>Grant active Premiere mock access manually for selected users.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>

        <section class="admin-vcoin-card admin-vcoin-manual-card">
          <h3>Manual Premiere access</h3>
          <p class="admin-vcoin-section-note">Search a user, review the identity, then grant access to the current active Premiere mock.</p>

          <div class="admin-vcoin-manual-grid">
            <div class="admin-vcoin-manual-search">
              <label>Search users
                <input id="admin-premiere-user-search" type="search" placeholder="telegram_id, username, email, full name, user id">
              </label>
              <div id="admin-premiere-user-results" class="admin-vcoin-user-results">
                <div class="admin-vcoin-empty">Type at least 2 characters to search.</div>
              </div>
            </div>

            <div id="admin-premiere-selected-user" class="admin-vcoin-selected-user">
              <div class="admin-vcoin-empty">Select a user to grant Premiere access.</div>
            </div>
          </div>
        </section>
      </div>
    `;
  };

  AdminPremiereSubscriptionsUI.renderSearchResults = function (users, statusText) {
    const host = document.getElementById("admin-premiere-user-results");
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
      <button type="button" class="admin-vcoin-user-result" data-premiere-user-id="${Number(user.id)}">
        ${renderUserAvatar(user)}
        <span>
          <strong>${escape(user.full_name || user.email || `User #${user.id}`)}</strong>
          <small>${user.telegram_id ? `TG ${escape(user.telegram_id)}` : "No Telegram ID"}${user.email ? ` - ${escape(user.email)}` : ""}</small>
        </span>
        <b>Grant</b>
      </button>
    `).join("");
  };

  AdminPremiereSubscriptionsUI.renderSelectedUser = function (user, result) {
    const host = document.getElementById("admin-premiere-selected-user");
    if (!host) return;
    if (!user) {
      host.innerHTML = `<div class="admin-vcoin-empty">Select a user to grant Premiere access.</div>`;
      return;
    }
    const access = result?.access;
    const premiere = result?.premiere;
    const granted = access ? `
      <div class="admin-vcoin-confirm-box">
        <strong>Premiere access granted</strong>
        <p>${escape(premiere?.title || "Active Premiere mock")}</p>
        <p>Expires: ${escape(formatDate(access.expires_at))}</p>
      </div>
    ` : "";
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
      <div class="admin-vcoin-confirm-box">
        <strong>Grant active Premiere access?</strong>
        <p>This will unlock the current active Premiere mock for this user.</p>
        <div class="admin-vcoin-confirm-actions">
          <button type="button" data-grant-premiere-access="${Number(user.id)}">Grant Premiere</button>
        </div>
      </div>
      ${granted}
    `;
  };

  AdminPremiereSubscriptionsUI.renderGrantError = function (message) {
    const host = document.getElementById("admin-premiere-selected-user");
    if (!host) return;
    host.insertAdjacentHTML("beforeend", `<div class="admin-vcoin-empty admin-vcoin-error">${escape(message)}</div>`);
  };
})();
