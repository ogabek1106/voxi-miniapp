window.VoxiDeepLinks = window.VoxiDeepLinks || {};

(function () {
  const handlers = {
    "odd-one-out": () => window.showVocabularyOddOneOutEntry?.(),
    "shadow-writing": () => window.showShadowWritingEntry?.(),
    "word-shuffle": () => window.showWordShuffleEntry?.(),
    "ielts-mock-test": () => window.showMocksEntry?.(),
    reading: () => window.showReadingEntry?.(),
    listening: () => window.showListeningEntry?.(),
    writing: () => window.showWritingEntry?.(),
    speaking: () => window.showSpeakingEntry?.()
  };

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  VoxiDeepLinks.isSupported = function (value) {
    return Boolean(handlers[normalize(value)]);
  };

  VoxiDeepLinks.open = function (value) {
    const key = normalize(value);
    const handler = handlers[key];
    if (!handler) return false;
    window.setTimeout(() => handler(), 0);
    return true;
  };

  VoxiDeepLinks.extractOpenValue = function (urlOrValue) {
    const raw = String(urlOrValue || "").trim();
    if (!raw) return "";
    if (handlers[normalize(raw)]) return normalize(raw);

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
