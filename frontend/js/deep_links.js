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
    console.log("[DEEP LINK] openOnce requested:", key);
    if (handlers[key]) {
      console.log("[DEEP LINK] Feature exists");
      if (typeof window.navigateToFeature === "function") {
        console.log(`[DEEP LINK] Calling navigateToFeature("${key}")`);
        if (key === "shadow-writing") console.trace("[ROUTER] Navigate to Shadow Writing");
        window.navigateToFeature(key);
        return true;
      }
      console.log("[DEEP LINK] Waiting for router");
      const handler = window[handlers[key]];
      if (typeof handler !== "function") {
        console.log("[DEEP LINK] Waiting for feature handler:", handlers[key]);
        return false;
      }
      console.log(`[DEEP LINK] Calling ${handlers[key]}()`);
      handler();
      return true;
    }
    const customHandler = customHandlers[key];
    if (!customHandler) {
      console.log("[DEEP LINK] Ignored because feature is unsupported:", key);
      return false;
    }
    console.log("[DEEP LINK] Calling custom handler:", key);
    customHandler();
    return true;
  }

  VoxiDeepLinks.open = function (value, options = {}) {
    const key = normalize(value);
    console.log("[DEEP LINK] Requested feature:", key);
    if (!VoxiDeepLinks.isSupported(key)) {
      console.log("[DEEP LINK] Ignored because feature is unsupported:", key);
      return false;
    }
    const attempts = Number(options.attempts || 12);
    const delayMs = Number(options.delayMs || 150);
    console.log("[DEEP LINK] Handler started");
    console.log("[DEEP LINK] Open options:", { attempts, delayMs });

    function tryOpen(remaining) {
      console.log("[DEEP LINK] Try open:", { key, remaining });
      if (openOnce(key)) {
        console.log("[DEEP LINK] Open succeeded:", key);
        return;
      }
      if (remaining <= 0) {
        console.log("[DEEP LINK] Open failed after retries:", key);
        return;
      }
      window.setTimeout(() => tryOpen(remaining - 1), delayMs);
    }

    window.setTimeout(() => tryOpen(attempts), 0);
    return true;
  };

  VoxiDeepLinks.extractOpenValue = function (urlOrValue) {
    const raw = String(urlOrValue || "").trim();
    if (!raw) {
      console.log("[DEEP LINK] No URL or open value provided");
      return "";
    }
    if (VoxiDeepLinks.isSupported(raw)) {
      console.log("[DEEP LINK] Direct open value detected:", normalize(raw));
      return normalize(raw);
    }

    try {
      const parsed = new URL(raw, window.location.origin);
      console.log("[DEEP LINK] Current URL:", parsed.href);
      console.log("[DEEP LINK] Query parameters:", {
        open: parsed.searchParams.get("open"),
        page: parsed.searchParams.get("page")
      });
      if (!parsed.search) console.log("[DEEP LINK] No query parameters");
      return normalize(parsed.searchParams.get("open"));
    } catch (_) {
      console.log("[DEEP LINK] URL parsing failed");
      return "";
    }
  };

  VoxiDeepLinks.handleCurrentUrl = function () {
    console.log("[DEEP LINK] Handler started");
    if (VoxiDeepLinks._handledInitial) {
      console.log("[DEEP LINK] Ignored because initial URL was already handled");
      return false;
    }
    VoxiDeepLinks._handledInitial = true;
    const value = VoxiDeepLinks.extractOpenValue(window.location.href);
    console.log("[DEEP LINK] Requested feature:", value || "(none)");
    if (!value) {
      console.log("[DEEP LINK] Ignored because no open parameter exists");
      return false;
    }
    if (!VoxiDeepLinks.isSupported(value)) {
      console.log("[DEEP LINK] Ignored because feature is unsupported:", value);
      return false;
    }
    console.log("[DEEP LINK] Feature exists");
    window.setTimeout(() => VoxiDeepLinks.open(value), 350);
    return true;
  };
})();
