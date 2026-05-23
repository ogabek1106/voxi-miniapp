window.AdminMatchWordsStatsState = window.AdminMatchWordsStatsState || {};

(function () {
  let stats = { summary: {}, items: [] };

  AdminMatchWordsStatsState.set = function (nextStats) {
    stats = {
      summary: nextStats?.summary || {},
      items: Array.isArray(nextStats?.items) ? nextStats.items : [],
    };
  };

  AdminMatchWordsStatsState.get = function () {
    return stats;
  };
})();
