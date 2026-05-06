window.AdminShadowWritingStatsLoader = window.AdminShadowWritingStatsLoader || {};

(function () {
  AdminShadowWritingStatsLoader.show = async function () {
    AdminShadowWritingStatsUI.renderLoading();
    try {
      const data = await AdminShadowWritingStatsApi.load();
      AdminShadowWritingStatsState.set(data);
      AdminShadowWritingStatsUI.render();
    } catch (error) {
      console.error("Shadow Writing stats error:", error);
      AdminShadowWritingStatsUI.renderError(error?.message || "Failed to load stats.");
    }
  };
})();

window.showAdminShadowWritingStats = function () {
  AdminShadowWritingStatsLoader.show();
};
