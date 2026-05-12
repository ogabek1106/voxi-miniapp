window.WordShuffleState = window.WordShuffleState || {};

(function () {
  const state = {
    entries: [],
    entryIndex: 0,
    current: null,
    slots: [],
    letters: [],
    score: 0,
    solvedCount: 0,
    streak: 0,
    bestStreak: 0,
    seconds: 0,
    helpAvailable: false,
    helpUsed: false,
    lastSolve: null,
    sessionId: null,
    gameOver: false,
    solving: false,
    wordStartedAt: 0,
    returnToAdmin: false,
  };

  WordShuffleState.get = function () {
    return state;
  };

  WordShuffleState.set = function (patch) {
    Object.assign(state, patch || {});
  };

  WordShuffleState.reset = function (entries) {
    const returnToAdmin = Boolean(state.returnToAdmin);
    state.entries = Array.isArray(entries) ? entries.slice() : [];
    state.entryIndex = 0;
    state.current = null;
    state.slots = [];
    state.letters = [];
    state.score = 0;
    state.solvedCount = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.seconds = 0;
    state.helpAvailable = false;
    state.helpUsed = false;
    state.lastSolve = null;
    state.sessionId = null;
    state.gameOver = false;
    state.solving = false;
    state.wordStartedAt = 0;
    state.returnToAdmin = returnToAdmin;
  };
})();
