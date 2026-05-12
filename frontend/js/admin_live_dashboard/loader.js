window.AdminLiveDashboardLoader = window.AdminLiveDashboardLoader || {};

(function () {
  const REFRESH_MS = 7000;
  let refreshTimer = null;

  async function loadOnce() {
    const data = await AdminLiveDashboardApi.load();
    AdminLiveDashboardState.set(data);
    AdminLiveDashboardUI.render();
  }

  AdminLiveDashboardLoader.show = async function () {
    AdminLiveDashboardLoader.stop();
    AdminLiveDashboardUI.renderLoading();
    try {
      await loadOnce();
      refreshTimer = window.setInterval(() => {
        loadOnce().catch((error) => console.error("Live Dashboard refresh error:", error));
      }, REFRESH_MS);
    } catch (error) {
      console.error("Live Dashboard error:", error);
      AdminLiveDashboardUI.renderError(error?.message || "Failed to load dashboard.");
    }
  };

  AdminLiveDashboardLoader.stop = function () {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };
})();

window.showAdminLiveDashboard = function () {
  AdminLiveDashboardLoader.show();
};
