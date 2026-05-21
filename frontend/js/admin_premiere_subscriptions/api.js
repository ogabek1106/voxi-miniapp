window.AdminPremiereSubscriptionsApi = window.AdminPremiereSubscriptionsApi || {};

(function () {
  function adminId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  AdminPremiereSubscriptionsApi.searchUsers = function (query) {
    return apiGet(`/vcoins/admin/users/search?admin_id=${encodeURIComponent(adminId() || "")}&q=${encodeURIComponent(query || "")}`);
  };

  AdminPremiereSubscriptionsApi.grant = function (targetUserId) {
    return apiPost("/admin/premiere/subscriptions/grant", {
      admin_id: adminId(),
      target_user_id: Number(targetUserId),
    });
  };
})();
