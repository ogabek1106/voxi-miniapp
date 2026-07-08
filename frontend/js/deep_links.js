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

  VoxiDeepLinks.open = function (value) {
    const key = normalize(value);
    if (!VoxiDeepLinks.isSupported(key)) return false;

    if (handlers[key]) {
      if (typeof window.navigateToFeature === "function") {
        return window.navigateToFeature(key);
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
    const value = VoxiDeepLinks.extractOpenValue(window.location.href);
    const exists = Boolean(value && VoxiDeepLinks.isSupported(value));
    if (!exists) return false;
    VoxiDeepLinks._handledInitial = true;
    return VoxiDeepLinks.open(value);
  };
})();
