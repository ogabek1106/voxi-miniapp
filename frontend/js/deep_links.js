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
    if (!VoxiDeepLinks.isSupported(key)) {
      console.log("[VERIFY] Deep link open failed.");
      console.log("[VERIFY] Reason:", `unsupported feature "${key}"`);
      return false;
    }

    if (handlers[key]) {
      if (typeof window.navigateToFeature === "function") {
        console.log(`[VERIFY] Calling: navigateToFeature("${key}")`);
        const result = window.navigateToFeature(key);
        console.log("[VERIFY] navigateToFeature finished.", { result });
        return result;
      }

      const handler = window[handlers[key]];
      if (typeof handler !== "function") {
        console.log("[VERIFY] Deep link open failed.");
        console.log("[VERIFY] Reason:", `handler "${handlers[key]}" does not exist`);
        return false;
      }
      handler();
      return true;
    }

    const customHandler = customHandlers[key];
    if (!customHandler) {
      console.log("[VERIFY] Deep link open failed.");
      console.log("[VERIFY] Reason:", `custom handler missing for "${key}"`);
      return false;
    }
    customHandler();
    return true;
  };

  VoxiDeepLinks.extractOpenValue = function (urlOrValue) {
    const raw = String(urlOrValue || "").trim();
    if (!raw) return "";
    if (VoxiDeepLinks.isSupported(raw)) return normalize(raw);

    try {
      const parsed = new URL(raw, window.location.origin);
      console.log("[VERIFY] Deep-link parser URL:", parsed.href);
      console.log("[VERIFY] Deep-link parser search:", parsed.search);
      console.log("[VERIFY] Deep-link parser open:", parsed.searchParams.get("open"));
      return normalize(parsed.searchParams.get("open"));
    } catch (_) {
      console.log("[VERIFY] Deep-link parser failed for:", raw);
      return "";
    }
  };

  VoxiDeepLinks.handleCurrentUrl = function () {
    if (VoxiDeepLinks._handledInitial) return false;
    const value = VoxiDeepLinks.extractOpenValue(window.location.href);
    const exists = Boolean(value && VoxiDeepLinks.isSupported(value));
    console.log("[VERIFY] Deep link exists:", exists);
    console.log("[VERIFY] Requested feature:", value || "(none)");
    if (!exists) return false;
    VoxiDeepLinks._handledInitial = true;
    return VoxiDeepLinks.open(value);
  };
})();
