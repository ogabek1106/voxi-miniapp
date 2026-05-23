window.MatchWordsState = window.MatchWordsState || {};

(function () {
  const initial = {
    entries: [],
    visiblePairs: [],
    visibleRightOrder: [],
    nextIndex: 0,
    selectedEnglishId: null,
    sessionId: null,
    returnToAdmin: false,
    isRunning: false,
    isFinishing: false,
    startedAt: 0,
    lastMatchAt: 0,
    timeLeft: 60,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    combo: 0,
    bestCombo: 0,
    matchTimes: [],
    levelCounts: {},
    xpEarned: 0,
    rafId: null,
  };

  let state = { ...initial };

  function clonePair(entry) {
    return {
      uid: `${entry.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      id: entry.id,
      english_text: entry.english_text,
      translation_text: entry.translation_text,
      level: entry.level || "B1",
      theme: entry.theme || null,
      removing: false,
      entering: true,
    };
  }

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  MatchWordsState.reset = function (entries = []) {
    const clean = shuffled(entries.filter((entry) => entry?.english_text && entry?.translation_text));
    const visibleCount = Math.min(5, Math.max(0, clean.length));
    const visiblePairs = [];
    for (let i = 0; i < visibleCount; i += 1) {
      visiblePairs.push(clonePair(clean[i]));
    }
    state = {
      ...initial,
      entries: clean,
      visiblePairs,
      visibleRightOrder: shuffled(visiblePairs.map((pair) => pair.uid)),
      nextIndex: visibleCount,
      timeLeft: 60,
      startedAt: performance.now(),
      lastMatchAt: performance.now(),
      returnToAdmin: state.returnToAdmin || false,
    };
    return state;
  };

  MatchWordsState.get = function () {
    return state;
  };

  MatchWordsState.set = function (patch) {
    state = { ...state, ...patch };
    return state;
  };

  MatchWordsState.markEntered = function () {
    state.visiblePairs = state.visiblePairs.map((pair) => ({ ...pair, entering: false }));
  };

  MatchWordsState.markRemoving = function (uid) {
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? { ...pair, removing: true } : pair);
  };

  MatchWordsState.replacePair = function (uid) {
    const entries = state.entries;
    if (!entries.length) return null;
    const entry = entries[state.nextIndex % entries.length];
    const nextPair = clonePair(entry);
    state.nextIndex += 1;
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? nextPair : pair);
    state.visibleRightOrder = state.visibleRightOrder.map((itemUid) => itemUid === uid ? nextPair.uid : itemUid);
    return nextPair;
  };

  MatchWordsState.findPair = function (uid) {
    return state.visiblePairs.find((pair) => pair.uid === uid) || null;
  };
})();
