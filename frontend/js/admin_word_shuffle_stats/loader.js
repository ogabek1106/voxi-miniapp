window.AdminWordShuffleStatsLoader = window.AdminWordShuffleStatsLoader || {};

(function () {
  AdminWordShuffleStatsLoader.show = async function () {
    AdminWordShuffleStatsUI.renderLoading();
    try {
      const data = await AdminWordShuffleStatsApi.load();
      AdminWordShuffleStatsState.set(data);
      AdminWordShuffleStatsUI.render();
    } catch (error) {
      console.error("Word Shuffle stats error:", error);
      AdminWordShuffleStatsUI.renderError(error?.message || "Failed to load stats.");
    }
  };
})();

window.showAdminWordShuffleStats = function () {
  AdminWordShuffleStatsLoader.show();
};
