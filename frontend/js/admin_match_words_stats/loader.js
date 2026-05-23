window.AdminMatchWordsStatsLoader = window.AdminMatchWordsStatsLoader || {};

(function () {
  AdminMatchWordsStatsLoader.show = async function () {
    AdminMatchWordsStatsUI.renderLoading();
    try {
      const data = await AdminMatchWordsStatsApi.load();
      AdminMatchWordsStatsState.set(data);
      AdminMatchWordsStatsUI.render();
    } catch (error) {
      console.error("Match Words stats error:", error);
      AdminMatchWordsStatsUI.renderError(error?.message || "Failed to load stats.");
    }
  };
})();

window.showAdminMatchWordsStats = function () {
  AdminMatchWordsStatsLoader.show();
};
