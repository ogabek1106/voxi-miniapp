window.VocabularyOddOneOutState = window.VocabularyOddOneOutState || {};

(function () {
  let state = {
    sets: [],
    index: 0,
    correct: 0,
    answered: false,
    lastResult: null,
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
      answered: false,
      lastResult: null,
    };
  };
})();
