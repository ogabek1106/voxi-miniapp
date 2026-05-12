window.WordShuffleLoader = window.WordShuffleLoader || {};

(function () {
  function userPayload() {
    const user = window.WebsiteAuthState?.getUser?.() || null;
    const telegramId = window.getTelegramId?.() || user?.telegram_id || null;
    return {
      user_id: user?.id || null,
      telegram_id: telegramId ? Number(telegramId) : null,
    };
  }

  WordShuffleLoader.finishIfNeeded = async function (status = "finished") {
    const state = WordShuffleState.get();
    if (!state.sessionId) return;
    const sessionId = state.sessionId;
    state.sessionId = null;
    try {
      await WordShuffleApi.finishSession(sessionId, {
        ...userPayload(),
        score: Number(state.score || 0),
        solved_count: Number(state.solvedCount || 0),
        best_streak: Number(state.bestStreak || 0),
        status,
      });
    } catch (error) {
      console.error("Word Shuffle finish session error:", error);
    }
  };

  WordShuffleLoader.start = async function () {
    WordShuffleUI.renderLoading();
    try {
      const data = await WordShuffleApi.gameData();
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      WordShuffleState.reset(WordShuffleLogic.shuffle(entries));
      if (!entries.length) {
        const screen = WordShuffleUI.screen();
        const backAction = WordShuffleState.get().returnToAdmin ? "showAdminWordShuffle()" : "goHome()";
        if (screen) {
          screen.innerHTML = `<div class="word-shuffle-screen"><div class="word-shuffle-empty">Word Shuffle is being prepared.</div><button class="word-shuffle-back" onclick="${backAction}">Back</button></div>`;
        }
        return;
      }
      const session = await WordShuffleApi.createSession(userPayload());
      WordShuffleState.set({ sessionId: session?.session_id || null });
      WordShuffleEngine.loadNext();
      WordShuffleTimer.start();
    } catch (error) {
      console.error("Word Shuffle load error:", error);
      const screen = WordShuffleUI.screen();
      const backAction = WordShuffleState.get().returnToAdmin ? "showAdminWordShuffle()" : "goHome()";
      if (screen) screen.innerHTML = `<div class="word-shuffle-screen"><div class="word-shuffle-empty">Could not load Word Shuffle.</div><button class="word-shuffle-back" onclick="${backAction}">Back</button></div>`;
    }
  };

  WordShuffleLoader.restart = async function () {
    await WordShuffleLoader.finishIfNeeded("restarted");
    WordShuffleLoader.start();
  };

  WordShuffleLoader.exit = async function () {
    WordShuffleTimer.stop();
    await WordShuffleLoader.finishIfNeeded("finished");
    document.body.classList.remove("word-shuffle-active");
    if (WordShuffleState.get().returnToAdmin && typeof showAdminWordShuffle === "function") {
      showAdminWordShuffle();
    } else if (typeof goHome === "function") {
      goHome();
    }
  };
})();

window.showWordShuffleEntry = function () {
  WordShuffleState.set({ returnToAdmin: false });
  WordShuffleLoader.start();
};
