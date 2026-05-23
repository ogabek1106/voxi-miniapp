window.MatchWordsEngine = window.MatchWordsEngine || {};

(function () {
  function levelCountsWith(pair) {
    const state = MatchWordsState.get();
    const level = String(pair?.level || "B1").toUpperCase();
    return { ...state.levelCounts, [level]: Number(state.levelCounts[level] || 0) + 1 };
  }

  function averageMatchSeconds(times) {
    if (!times.length) return null;
    const total = times.reduce((sum, value) => sum + Number(value || 0), 0);
    return total / times.length;
  }

  MatchWordsEngine.select = function (uid, side) {
    const state = MatchWordsState.get();
    if (!state.isRunning || state.isFinishing) return;
    const pair = MatchWordsState.findPair(uid);
    if (!pair || pair.removing) return;

    if (side === "english") {
      MatchWordsState.set({ selectedEnglishId: uid });
      MatchWordsUI.updateSelection();
      return;
    }

    const selected = state.selectedEnglishId;
    if (!selected) return;
    if (selected === uid) {
      MatchWordsEngine.correct(uid);
    } else {
      MatchWordsEngine.wrong(selected, uid);
    }
  };

  MatchWordsEngine.correct = function (uid) {
    const state = MatchWordsState.get();
    const pair = MatchWordsState.findPair(uid);
    if (!pair) return;
    const now = performance.now();
    const matchSeconds = Math.max(0.2, (now - Number(state.lastMatchAt || now)) / 1000);
    MatchWordsState.set({
      selectedEnglishId: null,
      correctCount: Number(state.correctCount || 0) + 1,
      lastMatchAt: now,
      matchTimes: [...state.matchTimes, matchSeconds],
      levelCounts: levelCountsWith(pair),
    });
    MatchWordsState.markRemoving(uid);
    MatchWordsCombo.applyCorrect();
    MatchWordsTimer.addSeconds(2);
    MatchWordsUI.updateStats();
    MatchWordsAnimations.correctPair(uid, () => {
      if (!MatchWordsState.get().isRunning) return;
      const nextPair = MatchWordsState.replacePair(uid);
      MatchWordsUI.renderGame();
      if (nextPair) MatchWordsAnimations.enterPair(nextPair.uid);
    });
  };

  MatchWordsEngine.wrong = function (englishUid, translationUid) {
    const state = MatchWordsState.get();
    MatchWordsState.set({ selectedEnglishId: null, wrongCount: Number(state.wrongCount || 0) + 1 });
    MatchWordsCombo.reset();
    MatchWordsTimer.addSeconds(-2);
    MatchWordsUI.updateSelection();
    MatchWordsAnimations.wrongPair(englishUid, translationUid);
  };

  MatchWordsEngine.gameOver = async function () {
    const state = MatchWordsState.get();
    if (state.isFinishing) return;
    MatchWordsTimer.stop();
    const survivedSeconds = Math.max(0, (performance.now() - Number(state.startedAt || performance.now())) / 1000);
    MatchWordsState.set({ isFinishing: true, survivedSeconds });
    let result = { xp_earned: 0 };
    try {
      result = await MatchWordsLoader.finishIfNeeded("finished");
      MatchWordsState.set({ xpEarned: Number(result?.xp_earned || 0) });
    } catch (error) {
      console.error("Match Words finish error:", error);
    }
    MatchWordsUI.renderResult(result || {});
  };

  MatchWordsEngine.sessionPayload = function (status = "finished") {
    const state = MatchWordsState.get();
    const user = window.WebsiteAuthState?.getUser?.() || null;
    const telegramId = window.getTelegramId?.() || user?.telegram_id || null;
    return {
      user_id: user?.id || null,
      telegram_id: telegramId ? Number(telegramId) : null,
      correct_count: Number(state.correctCount || 0),
      wrong_count: Number(state.wrongCount || 0),
      best_combo: Number(state.bestCombo || 0),
      survived_seconds: Math.round(Number(state.survivedSeconds || 0)),
      average_match_seconds: averageMatchSeconds(state.matchTimes),
      level_counts: state.levelCounts || {},
      status,
    };
  };
})();
