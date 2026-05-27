window.GamificationApi = window.GamificationApi || {};

(function () {
  function identityQuery() {
    const user = window.WebsiteAuthState?.getUser?.() || {};
    const telegramId = window.SharedUser?.getTelegramId?.() || user.telegram_id || null;
    if (user.id) return `user_id=${encodeURIComponent(user.id)}`;
    if (telegramId) return `telegram_id=${encodeURIComponent(telegramId)}`;
    return "";
  }

  GamificationApi.load = function () {
    const query = identityQuery();
    if (!query) return Promise.resolve(null);
    return apiGet(`/me/gamification?${query}`);
  };

  GamificationApi.claimMonthlyReward = function (milestoneDay) {
    const query = identityQuery();
    if (!query) return Promise.reject(new Error("missing_identity"));
    return apiPost(`/me/gamification/claim-monthly-reward?${query}`, {
      milestone_day: Number(milestoneDay),
    });
  };
})();
