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

  async function bindForm() {
    const form = document.getElementById("admin-notification-form");
    if (!form) return;
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
        await AdminNotificationsApi.create({
          title: formData.get("title"),
          message: formData.get("message"),
          image_url: imageUrl,
          link_type: linkType,
          link_url: normalizeLink(linkType, formData.get("link_url"))
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
