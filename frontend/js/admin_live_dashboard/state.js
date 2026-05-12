window.AdminLiveDashboardState = window.AdminLiveDashboardState || {};

(function () {
  let dashboard = {
    live_now: {},
    all_time: {},
    today: {},
    feature_usage: [],
    users: [],
  };

  AdminLiveDashboardState.set = function (nextDashboard) {
    dashboard = {
      live_now: nextDashboard?.live_now || {},
      all_time: nextDashboard?.all_time || {},
      today: nextDashboard?.today || {},
      feature_usage: Array.isArray(nextDashboard?.feature_usage) ? nextDashboard.feature_usage : [],
      users: Array.isArray(nextDashboard?.users) ? nextDashboard.users : [],
    };
  };

  AdminLiveDashboardState.get = function () {
    return dashboard;
  };
})();
