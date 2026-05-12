window.AdminWordShuffleStatsState = window.AdminWordShuffleStatsState || {};

(function () {
  let stats = { summary: {}, items: [] };

  AdminWordShuffleStatsState.set = function (nextStats) {
    stats = {
      summary: nextStats?.summary || {},
      items: Array.isArray(nextStats?.items) ? nextStats.items : [],
    };
  };

  AdminWordShuffleStatsState.get = function () {
    return stats;
  };
})();
