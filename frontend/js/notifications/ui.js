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

  function bellSvg() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 9.8c0-3.1-2-5.2-5-5.7V3a1 1 0 0 0-2 0v1.1c-3 .5-5 2.6-5 5.7v3.1c0 .7-.3 1.4-.8 1.9l-.6.6c-.6.6-.2 1.6.7 1.6h13.4c.9 0 1.3-1 .7-1.6l-.6-.6c-.5-.5-.8-1.2-.8-1.9V9.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  VoxiNotificationsUI.getBellMarkup = function () {
    return `
      <span class="voxi-notification-bell-icon" aria-hidden="true">${bellSvg()}</span>
      <span class="voxi-notification-badge" hidden>0</span>
    `;
  };

  VoxiNotificationsUI.mountBell = function (target) {
    if (!target || target.querySelector(".voxi-notification-bell")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "voxi-notification-bell";
    button.setAttribute("aria-label", "Open notifications");
    button.innerHTML = VoxiNotificationsUI.getBellMarkup();
    button.addEventListener("click", () => window.VoxiNotifications?.toggle?.());
    target.appendChild(button);
  };

  VoxiNotificationsUI.updateBells = function () {
    const { unreadCount, isOpen } = VoxiNotificationsState.get();
    document.querySelectorAll(".voxi-notification-bell").forEach((button) => {
      const hasUnread = unreadCount > 0;
      button.classList.toggle("has-unread", hasUnread);
      button.classList.toggle("is-active", Boolean(isOpen));
      if (!hasUnread) button.classList.remove("is-attention");

      const badge = button.querySelector(".voxi-notification-badge");
      if (!badge) return;
      badge.hidden = !hasUnread;
      badge.textContent = hasUnread ? (unreadCount > 9 ? "9+" : String(unreadCount)) : "";
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
        </div>
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
          `).join("") : `<div class="voxi-notification-empty">No notifications yet &#10024;</div>`}
        </div>
        <div class="voxi-notification-bottom">
          <button type="button" class="voxi-notification-read-all">Mark all as read</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) window.VoxiNotifications?.close?.();
    });
    drawer.querySelector(".voxi-notification-read-all")?.addEventListener("click", () => window.VoxiNotifications?.markAllRead?.());
    drawer.querySelectorAll(".voxi-notification-card").forEach((card) => {
      card.addEventListener("click", () => window.VoxiNotifications?.openItem?.(Number(card.dataset.id)));
    });
    VoxiNotificationsUI.observeVisibleCards(drawer);
  };

  VoxiNotificationsUI.observeVisibleCards = function (drawer) {
    const list = drawer?.querySelector(".voxi-notification-list");
    const cards = Array.from(drawer?.querySelectorAll(".voxi-notification-card.is-unread") || []);
    if (!list || !cards.length || !("IntersectionObserver" in window)) {
      cards.forEach((card) => window.VoxiNotifications?.trackVisibleRead?.(card, true));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        window.VoxiNotifications?.trackVisibleRead?.(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.8);
      });
    }, {
      root: list,
      threshold: [0, 0.8, 1]
    });
    cards.forEach((card) => observer.observe(card));
  };

  VoxiNotificationsUI.expandMessage = function (item) {
    const card = document.querySelector(`.voxi-notification-card[data-id="${Number(item.id)}"]`);
    if (!card) return;
    card.classList.add("is-expanded");
  };
})();
