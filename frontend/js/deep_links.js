window.VoxiDeepLinks = window.VoxiDeepLinks || {};

(function () {
  const handlers = {
    "odd-one-out": "showVocabularyOddOneOutEntry",
    "shadow-writing": "showShadowWritingEntry",
    "word-shuffle": "showWordShuffleEntry",
    "match-words": "showMatchWordsEntry",
    "ielts-mock-test": "showMocksEntry",
    reading: "showReadingEntry",
    listening: "showListeningEntry",
    writing: "showWritingEntry",
    speaking: "showSpeakingEntry"
  };

  const customHandlers = {
    premiere: () => window.PremiereUi?.openGrantedPremiere?.()
  };

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  VoxiDeepLinks.isSupported = function (value) {
    const key = normalize(value);
    return Boolean(handlers[key] || customHandlers[key]);
  };

  function openOnce(value) {
    const key = normalize(value);
    if (handlers[key]) {
      if (typeof window.navigateToFeature === "function") {
        window.navigateToFeature(key);
        return true;
      }
      const handler = window[handlers[key]];
      if (typeof handler !== "function") return false;
      handler();
      return true;
    }
    const customHandler = customHandlers[key];
    if (!customHandler) return false;
    customHandler();
    return true;
  }

  VoxiDeepLinks.open = function (value, options = {}) {
    const key = normalize(value);
    if (!VoxiDeepLinks.isSupported(key)) return false;
    const attempts = Number(options.attempts || 12);
    const delayMs = Number(options.delayMs || 150);

    function tryOpen(remaining) {
      if (openOnce(key)) return;
      if (remaining <= 0) return;
      window.setTimeout(() => tryOpen(remaining - 1), delayMs);
    }

    window.setTimeout(() => tryOpen(attempts), 0);
    return true;
  };

  VoxiDeepLinks.extractOpenValue = function (urlOrValue) {
    const raw = String(urlOrValue || "").trim();
    if (!raw) return "";
    if (VoxiDeepLinks.isSupported(raw)) return normalize(raw);

    try {
      const parsed = new URL(raw, window.location.origin);
      return normalize(parsed.searchParams.get("open"));
    } catch (_) {
      return "";
    }
  };

  VoxiDeepLinks.handleCurrentUrl = function () {
    if (VoxiDeepLinks._handledInitial) return false;
    VoxiDeepLinks._handledInitial = true;
    const value = VoxiDeepLinks.extractOpenValue(window.location.href);
    if (!value || !VoxiDeepLinks.isSupported(value)) return false;
    window.setTimeout(() => VoxiDeepLinks.open(value), 350);
    return true;
  };
})();
