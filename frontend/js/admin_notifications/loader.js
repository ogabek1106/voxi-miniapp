window.AdminNotificationsLoader = window.AdminNotificationsLoader || {};

(function () {
  async function loadItems() {
    const data = await AdminNotificationsApi.list();
    return Array.isArray(data?.notifications) ? data.notifications : [];
  }

  function normalizeLink(type, value) {
    const linkType = String(type || "none").toLowerCase();
    const raw = String(value || "").trim();
    if (linkType === "internal") {
      const openValue = window.VoxiDeepLinks?.extractOpenValue?.(raw) || raw;
      return window.VoxiDeepLinks?.isSupported?.(openValue) ? openValue : "";
    }
    if (linkType === "external") return raw;
    return "";
  }

  function normalizeDateTimeLocal(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function updateFormVisibility(form) {
    const mode = String(form?.elements?.schedule_mode?.value || "now");
    const linkType = String(form?.elements?.link_type?.value || "none");
    form?.querySelector(".admin-notification-schedule-fields")?.toggleAttribute("hidden", mode === "now");
    form?.querySelector("[name='repeat_interval_hours']")?.toggleAttribute("disabled", mode !== "repeat");
    form?.querySelector("[name='scheduled_at']")?.toggleAttribute("required", mode === "scheduled");
    form?.querySelector("[name='repeat_interval_hours']")?.toggleAttribute("required", mode === "repeat");
    form?.querySelector(".admin-notification-link-preset")?.toggleAttribute("hidden", linkType !== "internal");
    form?.querySelector(".admin-notification-link-manual")?.toggleAttribute("hidden", linkType === "internal");
  }

  async function bindForm() {
    const form = document.getElementById("admin-notification-form");
    if (!form) return;
    updateFormVisibility(form);
    form.elements?.schedule_mode?.addEventListener("change", () => updateFormVisibility(form));
    form.elements?.link_type?.addEventListener("change", () => updateFormVisibility(form));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        const formData = new FormData(form);
        let imageUrl = "";
        const imageFile = formData.get("image");
        if (imageFile && imageFile.size) {
          const uploaded = await AdminNotificationsApi.uploadImage(imageFile);
          imageUrl = uploaded?.url || "";
        }
        const linkType = String(formData.get("link_type") || "none");
        const linkValue = linkType === "internal" ? formData.get("internal_link") : formData.get("link_url");
        const scheduleMode = String(formData.get("schedule_mode") || "now");
        const repeatHours = Number(formData.get("repeat_interval_hours") || 0) || null;
        const maxSendCount = Number(formData.get("max_send_count") || 0) || null;
        const cooldownHours = Number(formData.get("cooldown_hours") || 0) || null;
        await AdminNotificationsApi.create({
          category: formData.get("category"),
          title: formData.get("title"),
          message: formData.get("message"),
          image_url: imageUrl,
          link_type: linkType,
          link_url: normalizeLink(linkType, linkValue),
          schedule_mode: scheduleMode,
          scheduled_at: normalizeDateTimeLocal(formData.get("scheduled_at")),
          repeat_interval_hours: scheduleMode === "repeat" ? repeatHours : null,
          max_send_count: maxSendCount,
          cooldown_hours: cooldownHours,
          is_enabled: formData.get("is_enabled") === "on"
        });
        await AdminNotificationsLoader.show();
        window.VoxiNotifications?.refresh?.();
      } catch (error) {
        console.error("Notification create failed:", error);
        alert("Could not send notification.");
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  AdminNotificationsLoader.show = async function () {
    hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    try {
      AdminNotificationsUI.render(await loadItems());
      bindForm();
    } catch (error) {
      console.error("Admin notifications load failed:", error);
      AdminNotificationsUI.render([]);
      bindForm();
    }
  };
})();

window.showAdminNotifications = function () {
  AdminNotificationsLoader.show();
};
