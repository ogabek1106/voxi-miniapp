window.MatchWordsLoader = window.MatchWordsLoader || {};

(function () {
  function userPayload() {
    const user = window.WebsiteAuthState?.getUser?.() || null;
    const telegramId = window.getTelegramId?.() || user?.telegram_id || null;
    return {
      user_id: user?.id || null,
      telegram_id: telegramId ? Number(telegramId) : null,
    };
  }

  MatchWordsLoader.finishIfNeeded = async function (status = "finished") {
    const state = MatchWordsState.get();
    if (!state.sessionId) return { xp_earned: 0 };
    const sessionId = state.sessionId;
    MatchWordsState.set({ sessionId: null });
    return MatchWordsApi.finishSession(sessionId, {
      ...MatchWordsEngine.sessionPayload(status),
      ...userPayload(),
    });
  };

  MatchWordsLoader.start = async function () {
    MatchWordsUI.renderLoading();
    try {
      const data = await MatchWordsApi.gameData();
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      MatchWordsState.reset(entries);
      if (entries.length < 6) {
        MatchWordsUI.renderEmpty("Match Words is being prepared.");
        return;
      }
      const session = await MatchWordsApi.createSession(userPayload());
      MatchWordsState.set({ sessionId: session?.session_id || null, isRunning: true });
      MatchWordsUI.renderGame();
      MatchWordsTimer.start();
    } catch (error) {
      console.error("Match Words load error:", error);
      MatchWordsUI.renderEmpty("Could not load Match Words.");
    }
  };

  MatchWordsLoader.restart = async function () {
    await MatchWordsLoader.start();
  };

  MatchWordsLoader.exit = async function () {
    const state = { ...MatchWordsState.get() };
    MatchWordsTimer.stop();
    try {
      await MatchWordsLoader.finishIfNeeded("finished");
    } catch (error) {
      console.error("Match Words exit finish error:", error);
    }
    document.documentElement.classList.remove("match-words-active");
    document.body.classList.remove("match-words-active");
    if (MatchWordsState.get().returnToAdmin && typeof showAdminMatchWords === "function") {
      showAdminMatchWords();
    } else if (typeof goHome === "function") {
      goHome();
    }
    window.VoxiFeedback?.requestFeedback?.({
      featureType: "match_words",
      contextKey: `match_words:${state.sessionId || 0}:${state.correctCount || 0}`,
      contextLabel: "Match Words",
      delayMs: 300,
    });
  };
})();

if (typeof window.showMatchWordsEntry !== "function") {
  window.showMatchWordsEntry = function () {
    MatchWordsState.set({ returnToAdmin: false });
    MatchWordsLoader.start();
  };
}
