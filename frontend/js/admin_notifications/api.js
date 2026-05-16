window.AdminNotificationsApi = window.AdminNotificationsApi || {};

(function () {
  function adminId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  AdminNotificationsApi.list = function () {
    return apiGet(`/admin/notifications?admin_id=${encodeURIComponent(adminId() || "")}`);
  };

  AdminNotificationsApi.create = function (payload) {
    return apiPost("/admin/notifications", {
      ...payload,
      admin_id: adminId()
    });
  };

  AdminNotificationsApi.uploadImage = async function (file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${window.API}/admin/upload-image`, {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error(await response.text() || "Image upload failed");
    return response.json();
  };
})();
