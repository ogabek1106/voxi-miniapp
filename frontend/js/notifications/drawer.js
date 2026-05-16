window.VoxiNotifications = window.VoxiNotifications || {};

(function () {
  let refreshTimer = null;
  let attentionTimer = null;

  async function refresh() {
    try {
      const data = await VoxiNotificationsApi.list();
      VoxiNotificationsState.set({
        items: Array.isArray(data?.notifications) ? data.notifications : [],
        unreadCount: Number(data?.unread_count || 0)
      });
      VoxiNotificationsUI.updateBells();
      if (VoxiNotificationsState.get().isOpen) {
        VoxiNotificationsUI.renderDrawer();
        VoxiNotificationsUI.updateBells();
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  function runAttentionPulse() {
    const state = VoxiNotificationsState.get();
    if (state.unreadCount <= 0) return;
    document.querySelectorAll(".voxi-notification-bell").forEach((button) => {
      button.classList.remove("is-attention");
      void button.offsetWidth;
      button.classList.add("is-attention");
      window.setTimeout(() => button.classList.remove("is-attention"), 1100);
    });
  }

  function mountMiniBell() {
    const header = document.querySelector("#screen-home .home-header");
    const balance = header?.querySelector(".home-balance");
    if (!header || !balance || header.querySelector(".voxi-notification-bell")) return;
    const wrap = document.createElement("div");
    wrap.className = "home-notification-slot";
    header.insertBefore(wrap, balance);
    VoxiNotificationsUI.mountBell(wrap);
  }

  VoxiNotifications.init = function () {
    mountMiniBell();
    VoxiNotificationsUI.updateBells();
    refresh();
    if (!refreshTimer) {
      refreshTimer = window.setInterval(refresh, 45000);
    }
    if (!attentionTimer) {
      attentionTimer = window.setInterval(runAttentionPulse, 120000);
    }
    VoxiNotificationsState.subscribe(() => VoxiNotificationsUI.updateBells());
  };

  VoxiNotifications.refresh = refresh;

  VoxiNotifications.open = function () {
    VoxiNotificationsState.set({ isOpen: true });
    document.body.classList.add("notifications-open");
    VoxiNotificationsUI.renderDrawer();
    VoxiNotificationsUI.updateBells();
  };

  VoxiNotifications.close = function () {
    VoxiNotificationsState.set({ isOpen: false });
    document.body.classList.remove("notifications-open");
    document.getElementById("voxi-notification-drawer")?.remove();
    VoxiNotificationsUI.updateBells();
  };

  VoxiNotifications.toggle = function () {
    if (VoxiNotificationsState.get().isOpen) VoxiNotifications.close();
    else VoxiNotifications.open();
  };

  VoxiNotifications.markAllRead = async function () {
    await VoxiNotificationsApi.markAllRead();
    await refresh();
  };

  VoxiNotifications.openItem = async function (id) {
    const item = VoxiNotificationsState.get().items.find((entry) => Number(entry.id) === Number(id));
    if (!item) return;
    await VoxiNotificationsApi.markRead(id).catch((error) => console.error("Notification read failed:", error));
    await refresh();

    if (item.link_type === "internal" && item.link_url) {
      const openValue = window.VoxiDeepLinks?.extractOpenValue?.(item.link_url);
      if (openValue && window.VoxiDeepLinks?.open?.(openValue)) {
        VoxiNotifications.close();
      }
      return;
    }

    if (item.link_type === "external" && item.link_url) {
      window.open(item.link_url, "_blank", "noopener,noreferrer");
      return;
    }

    VoxiNotificationsUI.expandMessage(item);
  };
})();
