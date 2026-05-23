window.MatchWordsState = window.MatchWordsState || {};

(function () {
  const initial = {
    entries: [],
    visiblePairs: [],
    visibleRightItems: [],
    nextIndex: 0,
    decoyIndex: 0,
    missingLeftUid: null,
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

  function cloneDecoy(entry) {
    return {
      uid: `decoy-${entry.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      id: entry.id,
      translation_text: entry.translation_text,
      level: entry.level || "B1",
      isDecoy: true,
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
    const missingLeftUid = visiblePairs[visiblePairs.length - 1]?.uid || null;
    const firstDecoyEntry = clean[visibleCount] || clean[0] || null;
    const visibleRightItems = shuffled([
      ...visiblePairs.slice(0, Math.max(0, visiblePairs.length - 1)).map((pair) => ({ uid: pair.uid, isDecoy: false, entering: pair.entering })),
      ...(firstDecoyEntry ? [cloneDecoy(firstDecoyEntry)] : []),
    ]);
    state = {
      ...initial,
      entries: clean,
      visiblePairs,
      visibleRightItems,
      nextIndex: visibleCount,
      decoyIndex: visibleCount + 1,
      missingLeftUid,
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
    state.visibleRightItems = state.visibleRightItems.map((item) => ({ ...item, entering: false }));
  };

  MatchWordsState.markRemoving = function (uid) {
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? { ...pair, removing: true } : pair);
    state.visibleRightItems = state.visibleRightItems.map((item) => item.uid === uid ? { ...item, removing: true } : item);
  };

  MatchWordsState.replacePair = function (uid) {
    const entries = state.entries;
    if (!entries.length) return null;
    const entry = entries[state.nextIndex % entries.length];
    const nextPair = clonePair(entry);
    const previousMissingUid = state.missingLeftUid;
    state.nextIndex += 1;
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? nextPair : pair);
    state.visibleRightItems = state.visibleRightItems.map((item) => {
      if (item.uid !== uid) return item;
      if (previousMissingUid) return { uid: previousMissingUid, isDecoy: false, entering: true };
      const decoyEntry = entries[state.decoyIndex % entries.length];
      state.decoyIndex += 1;
      return cloneDecoy(decoyEntry);
    });
    state.missingLeftUid = nextPair.uid;
    return nextPair;
  };

  MatchWordsState.findPair = function (uid) {
    return state.visiblePairs.find((pair) => pair.uid === uid) || null;
  };

  MatchWordsState.getRightItems = function () {
    return state.visibleRightItems.map((item) => {
      if (item.isDecoy) return item;
      const pair = MatchWordsState.findPair(item.uid);
      return pair ? { ...pair, ...item, translation_text: pair.translation_text } : item;
    });
  };
})();
