window.AdminShadowWritingStatsState = window.AdminShadowWritingStatsState || {};

(function () {
  let stats = { summary: {}, items: [] };

  AdminShadowWritingStatsState.set = function (nextStats) {
    stats = {
      summary: nextStats?.summary || {},
      items: Array.isArray(nextStats?.items) ? nextStats.items : [],
    };
  };

  AdminShadowWritingStatsState.get = function () {
    return stats;
  };
})();
