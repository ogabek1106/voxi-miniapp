window.SharedUser = window.SharedUser || {};

(function () {
  function telegramId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  window.SharedUser.getTelegramId = telegramId;

  window.SharedUser.loadMe = async function () {
    const id = telegramId();
    if (!id) return null;
    return apiGet(`/me?telegram_id=${id}`);
  };

  window.SharedUser.getFullName = function (me) {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const firstName = (me?.name || tgUser?.first_name || "").trim();
    const lastName = (me?.surname || tgUser?.last_name || "").trim();
    return [firstName, lastName].filter(Boolean).join(" ") || "Profile";
  };

  window.SharedUser.getBalance = function (me) {
    const raw = me?.v_coins ?? me?.v_coin_balance ?? me?.vcoin_balance ?? me?.v_coin ?? me?.balance ?? 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  };

  window.SharedUser.getLastScore = function (me) {
    const activityList = Array.isArray(me?.last_activity)
      ? me.last_activity.filter(Boolean)
      : (me?.last_activity ? [me.last_activity] : []);
    if (window.ProfileUI?.formatLastScore) {
      return window.ProfileUI.formatLastScore(activityList[0]);
    }
    return "-";
  };
})();
