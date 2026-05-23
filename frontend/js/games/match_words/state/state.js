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
    selectedTranslationId: null,
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

  function emptyItem() {
    return {
      uid: `empty-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      isEmpty: true,
      entering: true,
    };
  }

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

  function uniqueEntries(entries) {
    const seenPairs = new Set();
    const seenEnglish = new Set();
    const seenTranslations = new Set();
    return entries.filter((entry) => {
      if (!entry?.english_text || !entry?.translation_text) return false;
      const englishKey = String(entry.english_text).trim().toLowerCase();
      const translationKey = String(entry.translation_text).trim().toLowerCase();
      const pairKey = `${englishKey}::${translationKey}`;
      if (seenPairs.has(pairKey) || seenEnglish.has(englishKey) || seenTranslations.has(translationKey)) return false;
      seenPairs.add(pairKey);
      seenEnglish.add(englishKey);
      seenTranslations.add(translationKey);
      return true;
    });
  }

  MatchWordsState.reset = function (entries = []) {
    const clean = shuffled(uniqueEntries(entries));
    const visibleCount = Math.min(5, Math.max(0, clean.length));
    const visiblePairs = [];
    for (let i = 0; i < visibleCount; i += 1) {
      visiblePairs.push(clonePair(clean[i]));
    }
    while (visiblePairs.length < 5) {
      visiblePairs.push(emptyItem());
    }
    const missingLeftUid = visibleCount > 1 ? [...visiblePairs].reverse().find((pair) => !pair.isEmpty)?.uid || null : null;
    const firstDecoyEntry = clean[visibleCount] || null;
    const rightMatchCount = missingLeftUid ? Math.max(0, visibleCount - 1) : visibleCount;
    const visibleRightItems = shuffled([
      ...visiblePairs
        .filter((pair) => !pair.isEmpty)
        .slice(0, rightMatchCount)
        .map((pair) => ({ uid: pair.uid, isDecoy: false, entering: pair.entering })),
      ...(firstDecoyEntry ? [cloneDecoy(firstDecoyEntry)] : []),
    ]);
    while (visibleRightItems.length < 5) {
      visibleRightItems.push(emptyItem());
    }
    state = {
      ...initial,
      entries: clean,
      visiblePairs,
      visibleRightItems,
      nextIndex: firstDecoyEntry ? visibleCount + 1 : visibleCount,
      decoyIndex: firstDecoyEntry ? visibleCount + 1 : visibleCount,
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
    if (!uid) return;
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? { ...pair, removing: true } : pair);
    state.visibleRightItems = state.visibleRightItems.map((item) => item.uid === uid ? { ...item, removing: true } : item);
  };

  MatchWordsState.replacePair = function (uid) {
    const entries = state.entries;
    if (!entries.length) return null;
    const entry = state.nextIndex < entries.length ? entries[state.nextIndex] : null;
    const nextPair = entry ? clonePair(entry) : emptyItem();
    const previousMissingUid = state.missingLeftUid;
    if (entry) state.nextIndex += 1;
    state.visiblePairs = state.visiblePairs.map((pair) => pair.uid === uid ? nextPair : pair);
    state.visibleRightItems = state.visibleRightItems.map((item) => {
      if (item.uid !== uid) return item;
      if (previousMissingUid) return { uid: previousMissingUid, isDecoy: false, entering: true };
      return emptyItem();
    });
    state.missingLeftUid = nextPair.isEmpty ? null : nextPair.uid;
    return nextPair.isEmpty ? null : nextPair;
  };

  MatchWordsState.findPair = function (uid) {
    return state.visiblePairs.find((pair) => pair.uid === uid && !pair.isEmpty) || null;
  };

  MatchWordsState.getRightItems = function () {
    return state.visibleRightItems.map((item) => {
      if (item.isEmpty) return item;
      if (item.isDecoy) return item;
      const pair = MatchWordsState.findPair(item.uid);
      return pair ? { ...pair, ...item, translation_text: pair.translation_text } : item;
    });
  };
})();
