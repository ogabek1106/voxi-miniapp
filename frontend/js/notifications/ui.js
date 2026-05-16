window.VoxiNotificationsUI = window.VoxiNotificationsUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function imageSrc(url) {
    if (!url) return "";
    return String(url).startsWith("http") ? String(url) : `${window.API}${url}`;
  }

  VoxiNotificationsUI.mountBell = function (target) {
    if (!target || target.querySelector(".voxi-notification-bell")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "voxi-notification-bell";
    button.setAttribute("aria-label", "Open notifications");
    button.innerHTML = `
      <span class="voxi-notification-bell-icon" aria-hidden="true">🔔</span>
      <span class="voxi-notification-badge" hidden>0</span>
    `;
    button.addEventListener("click", () => window.VoxiNotifications?.toggle?.());
    target.appendChild(button);
  };

  VoxiNotificationsUI.updateBells = function () {
    const { unreadCount } = VoxiNotificationsState.get();
    document.querySelectorAll(".voxi-notification-bell").forEach((button) => {
      button.classList.toggle("has-unread", unreadCount > 0);
      const badge = button.querySelector(".voxi-notification-badge");
      if (!badge) return;
      badge.hidden = unreadCount <= 0;
      badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    });
  };

  VoxiNotificationsUI.renderDrawer = function () {
    document.getElementById("voxi-notification-drawer")?.remove();
    const state = VoxiNotificationsState.get();
    const drawer = document.createElement("div");
    drawer.id = "voxi-notification-drawer";
    drawer.className = "voxi-notification-drawer";
    drawer.innerHTML = `
      <div class="voxi-notification-panel" role="dialog" aria-modal="true" aria-label="Notifications">
        <div class="voxi-notification-top">
          <strong>Notifications</strong>
          <button type="button" class="voxi-notification-close" aria-label="Close">×</button>
        </div>
        <button type="button" class="voxi-notification-read-all">Mark all as read</button>
        <div class="voxi-notification-list">
          ${state.items.length ? state.items.map((item) => `
            <button type="button" class="voxi-notification-card ${item.is_read ? "is-read" : "is-unread"}" data-id="${Number(item.id)}">
              ${item.image_url ? `<img src="${escape(imageSrc(item.image_url))}" alt="">` : ""}
              <span class="voxi-notification-card-body">
                <span class="voxi-notification-card-title">${escape(item.title)}</span>
                <span class="voxi-notification-card-message">${escape(item.message)}</span>
                <span class="voxi-notification-card-time">${escape(formatTime(item.created_at))}</span>
              </span>
              ${item.is_read ? "" : `<span class="voxi-notification-dot" aria-hidden="true"></span>`}
            </button>
          `).join("") : `<div class="voxi-notification-empty">No notifications yet ✨</div>`}
        </div>
      </div>
    `;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) window.VoxiNotifications?.close?.();
    });
    drawer.querySelector(".voxi-notification-close")?.addEventListener("click", () => window.VoxiNotifications?.close?.());
    drawer.querySelector(".voxi-notification-read-all")?.addEventListener("click", () => window.VoxiNotifications?.markAllRead?.());
    drawer.querySelectorAll(".voxi-notification-card").forEach((card) => {
      card.addEventListener("click", () => window.VoxiNotifications?.openItem?.(Number(card.dataset.id)));
    });
  };

  VoxiNotificationsUI.expandMessage = function (item) {
    const card = document.querySelector(`.voxi-notification-card[data-id="${Number(item.id)}"]`);
    if (!card) return;
    card.classList.add("is-expanded");
  };
})();
