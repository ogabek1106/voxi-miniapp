window.AdminVocabularyOddOneOutStatsState = window.AdminVocabularyOddOneOutStatsState || {};

(function () {
  let stats = { summary: {}, items: [] };

  AdminVocabularyOddOneOutStatsState.set = function (nextStats) {
    stats = {
      summary: nextStats?.summary || {},
      items: Array.isArray(nextStats?.items) ? nextStats.items : [],
    };
  };

  AdminVocabularyOddOneOutStatsState.get = function () {
    return stats;
  };
})();
