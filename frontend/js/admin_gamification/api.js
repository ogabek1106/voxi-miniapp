window.AdminGamificationApi = window.AdminGamificationApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || 0);
  }

  function adminQuery() {
    return `telegram_id=${encodeURIComponent(adminId())}`;
  }

  AdminGamificationApi.listBadges = function () {
    return apiGet(`/admin/gamification/badges?${adminQuery()}`);
  };

  AdminGamificationApi.saveBadge = function (badge) {
    if (badge.id) return apiPut(`/admin/gamification/badges/${Number(badge.id)}?${adminQuery()}`, badge);
    return apiPost(`/admin/gamification/badges?${adminQuery()}`, badge);
  };

  AdminGamificationApi.deactivateBadge = function (id) {
    return apiDelete(`/admin/gamification/badges/${Number(id)}?${adminQuery()}`);
  };

  AdminGamificationApi.uploadIcon = async function (file) {
    const data = new FormData();
    data.append("file", file);
    return apiRequest(`/admin/gamification/badges/upload-icon?${adminQuery()}`, {
      method: "POST",
      body: data,
    });
  };

  AdminGamificationApi.listRewards = function () {
    return apiGet(`/admin/gamification/monthly-rewards?${adminQuery()}`);
  };

  AdminGamificationApi.saveReward = function (reward) {
    if (reward.id) return apiPut(`/admin/gamification/monthly-rewards/${Number(reward.id)}?${adminQuery()}`, reward);
    return apiPost(`/admin/gamification/monthly-rewards?${adminQuery()}`, reward);
  };

  AdminGamificationApi.deactivateReward = function (id) {
    return apiDelete(`/admin/gamification/monthly-rewards/${Number(id)}?${adminQuery()}`);
  };
})();
