window.VocabularyOddOneOutState = window.VocabularyOddOneOutState || {};

(function () {
  let state = {
    sets: [],
    index: 0,
    correct: 0,
    streak: 0,
    comboBreak: null,
    answered: false,
    lastResult: null,
    sessionStartedAt: null,
    questionStartedAt: null,
    totalAnswerMs: 0,
    answeredCount: 0,
    wrong: 0,
    timeouts: 0,
    bestStreak: 0,
    analyticsSaved: false,
  };

  VocabularyOddOneOutState.set = function (patch) {
    state = { ...state, ...(patch || {}) };
  };

  VocabularyOddOneOutState.get = function () {
    return state;
  };

  VocabularyOddOneOutState.reset = function (sets) {
    state = {
      sets: Array.isArray(sets) ? sets : [],
      index: 0,
      correct: 0,
      streak: 0,
      comboBreak: null,
      answered: false,
      lastResult: null,
      sessionStartedAt: Date.now(),
      questionStartedAt: null,
      totalAnswerMs: 0,
      answeredCount: 0,
      wrong: 0,
      timeouts: 0,
      bestStreak: 0,
      analyticsSaved: false,
    };
  };
})();
