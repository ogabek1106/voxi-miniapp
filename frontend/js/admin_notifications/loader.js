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

  function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  function resetForm(form) {
    form.reset();
    form.dataset.editingId = "";
    const editing = document.getElementById("admin-notification-editing");
    const submit = document.getElementById("admin-notification-submit");
    if (editing) editing.hidden = true;
    if (submit) submit.textContent = "Create notification";
    form.elements.existing_image_url.value = "";
    updateFormVisibility(form);
  }

  function fillForm(form, item) {
    if (!item) return;
    form.dataset.editingId = String(item.id);
    form.elements.category.value = item.category || "custom_manual_notification";
    form.elements.schedule_mode.value = item.schedule_mode || "now";
    form.elements.title.value = item.title || "";
    form.elements.message.value = item.message || "";
    form.elements.existing_image_url.value = item.image_url || "";
    form.elements.link_type.value = item.link_type || "none";
    form.elements.link_url.value = item.link_type === "internal" ? "" : (item.link_url || "");
    form.elements.internal_link.value = item.link_type === "internal" ? (item.link_url || "") : "";
    form.elements.scheduled_at.value = toDateTimeLocal(item.scheduled_at || item.next_send_at);
    form.elements.repeat_interval_hours.value = item.repeat_interval_hours || 24;
    form.elements.cooldown_hours.value = item.cooldown_hours || "";
    form.elements.max_send_count.value = item.max_send_count || "";
    form.elements.is_enabled.checked = item.is_enabled !== false;
    const editing = document.getElementById("admin-notification-editing");
    const submit = document.getElementById("admin-notification-submit");
    if (editing) editing.hidden = false;
    if (submit) submit.textContent = "Update notification";
    updateFormVisibility(form);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildPayload(form, imageUrl) {
    const formData = new FormData(form);
    const linkType = String(formData.get("link_type") || "none");
    const linkValue = linkType === "internal" ? formData.get("internal_link") : formData.get("link_url");
    const scheduleMode = String(formData.get("schedule_mode") || "now");
    const repeatHours = Number(formData.get("repeat_interval_hours") || 0) || null;
    const maxSendCount = Number(formData.get("max_send_count") || 0) || null;
    const cooldownHours = Number(formData.get("cooldown_hours") || 0) || null;
    return {
      category: formData.get("category"),
      title: formData.get("title"),
      message: formData.get("message"),
      image_url: imageUrl || formData.get("existing_image_url") || "",
      link_type: linkType,
      link_url: normalizeLink(linkType, linkValue),
      schedule_mode: scheduleMode,
      scheduled_at: normalizeDateTimeLocal(formData.get("scheduled_at")),
      repeat_interval_hours: scheduleMode === "repeat" ? repeatHours : null,
      max_send_count: maxSendCount,
      cooldown_hours: cooldownHours,
      is_enabled: formData.get("is_enabled") === "on"
    };
  }

  function bindLibrary(items) {
    const form = document.getElementById("admin-notification-form");
    const byId = new Map((items || []).map((item) => [Number(item.id), item]));
    document.querySelectorAll(".admin-notification-select").forEach((button) => {
      button.addEventListener("click", () => fillForm(form, byId.get(Number(button.dataset.id))));
    });
    document.querySelectorAll(".admin-notification-delete").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await AdminNotificationsApi.delete(Number(button.dataset.id));
          await AdminNotificationsLoader.show();
          window.VoxiNotifications?.refresh?.();
        } catch (error) {
          console.error("Notification delete failed:", error);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function bindForm() {
    const form = document.getElementById("admin-notification-form");
    if (!form) return;
    updateFormVisibility(form);
    form.elements?.schedule_mode?.addEventListener("change", () => updateFormVisibility(form));
    form.elements?.link_type?.addEventListener("change", () => updateFormVisibility(form));
    document.getElementById("admin-notification-new")?.addEventListener("click", () => resetForm(form));
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
        const payload = buildPayload(form, imageUrl);
        const editingId = Number(form.dataset.editingId || 0);
        if (editingId) await AdminNotificationsApi.update(editingId, payload);
        else await AdminNotificationsApi.create(payload);
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
      const items = await loadItems();
      AdminNotificationsUI.render(items);
      bindForm();
      bindLibrary(items);
    } catch (error) {
      console.error("Admin notifications load failed:", error);
      AdminNotificationsUI.render([]);
      bindForm();
      bindLibrary([]);
    }
  };
})();

window.showAdminNotifications = function () {
  AdminNotificationsLoader.show();
};
