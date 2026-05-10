window.WordMergeState = window.WordMergeState || {};

(function () {
  let state = {
    families: [],
    board: [],
    score: 0,
    mastered: 0,
    moves: 0,
    sessionId: null,
    activeFamilyIds: [],
    familyQueue: [],
    primaryFamilyId: null,
    secondaryFamilyId: null,
    masteredByFamily: {},
    gameOver: false,
  };

  WordMergeState.set = function (patch) {
    state = { ...state, ...(patch || {}) };
  };

  WordMergeState.get = function () {
    return state;
  };

  WordMergeState.reset = function (families) {
    state = {
      families: Array.isArray(families) ? families : [],
      board: [],
      score: 0,
      mastered: 0,
      moves: 0,
      sessionId: null,
      activeFamilyIds: [],
      familyQueue: (Array.isArray(families) ? families : []).map((family) => Number(family.id)),
      primaryFamilyId: null,
      secondaryFamilyId: null,
      masteredByFamily: {},
      gameOver: false,
    };
  };
})();
