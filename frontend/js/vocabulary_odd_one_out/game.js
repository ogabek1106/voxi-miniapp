window.VocabularyOddOneOutGame = window.VocabularyOddOneOutGame || {};

(function () {
  const QUESTION_SECONDS = 10;
  const EXPLANATION_SECONDS = 12;
  let questionTimerId = null;
  let explanationTimerId = null;
  let explanationAdvanceTimerId = null;
  let cleanupTimerId = null;
  let analyticsSavePromise = Promise.resolve();

  function clearTimer(id) {
    if (id) clearInterval(id);
  }

  function stopCleanupTimer() {
    if (cleanupTimerId) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
  }

  function stopExplanationAdvanceTimer() {
    if (explanationAdvanceTimerId) {
      clearTimeout(explanationAdvanceTimerId);
      explanationAdvanceTimerId = null;
    }
  }

  VocabularyOddOneOutGame.stopTimers = function () {
    clearTimer(questionTimerId);
    clearTimer(explanationTimerId);
    questionTimerId = null;
    explanationTimerId = null;
    stopExplanationAdvanceTimer();
    stopCleanupTimer();
  };

  VocabularyOddOneOutGame.exit = function () {
    VocabularyOddOneOutGame.stopTimers();
    if (typeof goHome === "function") goHome();
  };

  VocabularyOddOneOutGame.startQuestionTimer = function () {
    VocabularyOddOneOutGame.stopTimers();
    VocabularyOddOneOutState.set({ questionStartedAt: Date.now() });
    let remaining = QUESTION_SECONDS;
    VocabularyOddOneOutUI.renderTimer({ seconds: remaining, mode: "question" });
    questionTimerId = setInterval(() => {
      remaining -= 1;
      VocabularyOddOneOutUI.renderTimer({ seconds: remaining, mode: "question" });
      if (remaining <= 0) {
        clearTimer(questionTimerId);
        questionTimerId = null;
        VocabularyOddOneOutGame.timeout();
      }
    }, 1000);
  };

  VocabularyOddOneOutGame.startExplanationTimer = function ({ timedOut = false } = {}) {
    clearTimer(questionTimerId);
    questionTimerId = null;
    clearTimer(explanationTimerId);
    stopExplanationAdvanceTimer();
    const endsAt = Date.now() + EXPLANATION_SECONDS * 1000;
    let lastRendered = null;
    function tick() {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (remaining !== lastRendered) {
        VocabularyOddOneOutUI.renderTimer({ seconds: remaining, mode: "explanation" });
        lastRendered = remaining;
      }
      if (remaining <= 0) {
        clearTimer(explanationTimerId);
        explanationTimerId = null;
        if (!timedOut) {
          stopExplanationAdvanceTimer();
          VocabularyOddOneOutGame.next();
        }
      }
    }
    tick();
    explanationTimerId = setInterval(() => {
      tick();
    }, 250);
    if (!timedOut) {
      explanationAdvanceTimerId = setTimeout(() => {
        explanationAdvanceTimerId = null;
        if (explanationTimerId) {
          clearTimer(explanationTimerId);
          explanationTimerId = null;
        }
        VocabularyOddOneOutGame.next();
      }, EXPLANATION_SECONDS * 1000 + 150);
    }
    if (timedOut) {
      stopCleanupTimer();
      cleanupTimerId = setTimeout(() => {
        const state = VocabularyOddOneOutState.get();
        if (state.answered && state.lastResult?.timed_out) {
          VocabularyOddOneOutUI.renderResult();
        }
      }, EXPLANATION_SECONDS * 1000);
    }
  };

  VocabularyOddOneOutGame.answer = async function (selectedWordId) {
    const state = VocabularyOddOneOutState.get();
    if (state.answered) return;
    const set = state.sets[state.index];
    if (!set) return;
    clearTimer(questionTimerId);
    questionTimerId = null;
    VocabularyOddOneOutState.set({ answered: true });
    try {
      const result = await VocabularyOddOneOutApi.check({ setId: set.id, selectedWordId });
      const nextStreak = result.correct ? state.streak + 1 : 0;
      const answerMs = Math.max(0, Date.now() - Number(state.questionStartedAt || Date.now()));
      VocabularyOddOneOutState.set({
        correct: state.correct + (result.correct ? 1 : 0),
        streak: nextStreak,
        comboBreak: !result.correct && state.streak >= 3 ? state.streak : null,
        lastResult: result,
        wrong: state.wrong + (result.correct ? 0 : 1),
        answeredCount: state.answeredCount + 1,
        totalAnswerMs: state.totalAnswerMs + answerMs,
        bestStreak: Math.max(Number(state.bestStreak || 0), nextStreak),
      });
      VocabularyOddOneOutUI.renderFeedback({
        selectedWordId,
        correct: Boolean(result.correct),
        correctWordId: result.correct_word_id,
        explanation: result.explanation,
        timedOut: false,
      });
      VocabularyOddOneOutGame.recordSession();
      VocabularyOddOneOutGame.startExplanationTimer({ timedOut: false });
    } catch (error) {
      console.error("Odd One Out check error:", error);
      VocabularyOddOneOutState.set({ answered: false });
      VocabularyOddOneOutGame.startQuestionTimer();
    }
  };

  VocabularyOddOneOutGame.timeout = async function () {
    const state = VocabularyOddOneOutState.get();
    if (state.answered) return;
    const set = state.sets[state.index];
    if (!set) return;
    VocabularyOddOneOutState.set({ answered: true });
    try {
      const result = await VocabularyOddOneOutApi.check({
        setId: set.id,
        selectedWordId: null,
        timedOut: true,
      });
      VocabularyOddOneOutState.set({
        streak: 0,
        comboBreak: state.streak >= 3 ? state.streak : null,
        lastResult: result,
        wrong: state.wrong + 1,
        answeredCount: state.answeredCount + 1,
        totalAnswerMs: state.totalAnswerMs + QUESTION_SECONDS * 1000,
        timeouts: state.timeouts + 1,
      });
      VocabularyOddOneOutUI.renderFeedback({
        selectedWordId: null,
        correct: false,
        correctWordId: result.correct_word_id,
        explanation: result.explanation,
        timedOut: true,
      });
      VocabularyOddOneOutGame.recordSession();
      VocabularyOddOneOutGame.startExplanationTimer({ timedOut: true });
    } catch (error) {
      console.error("Odd One Out timeout error:", error);
      VocabularyOddOneOutState.set({ answered: false });
    }
  };

  VocabularyOddOneOutGame.next = function () {
    VocabularyOddOneOutGame.stopTimers();
    const state = VocabularyOddOneOutState.get();
    VocabularyOddOneOutState.set({
      index: state.index + 1,
      answered: false,
      comboBreak: null,
      lastResult: null,
    });
    VocabularyOddOneOutUI.renderPuzzle();
  };

  VocabularyOddOneOutGame.recordSession = function () {
    analyticsSavePromise = analyticsSavePromise.catch(() => null).then(async () => {
      const state = VocabularyOddOneOutState.get();
      const user = window.WebsiteAuthState?.getUser?.() || null;
      const telegramId = window.getTelegramId?.() || user?.telegram_id || null;
      const totalSetsPlayed = Math.max(0, Number(state.answeredCount || 0));
      if (!totalSetsPlayed) return;
      const totalMs = Math.max(0, Date.now() - Number(state.sessionStartedAt || Date.now()));
      try {
        const response = await VocabularyOddOneOutApi.recordAttempt({
          attempt_id: state.analyticsAttemptId || null,
          user_id: user?.id || null,
          telegram_id: telegramId ? Number(telegramId) : null,
          total_sets_played: totalSetsPlayed,
          correct_answers: Number(state.correct || 0),
          wrong_answers: Number(state.wrong || 0),
          timeouts: Number(state.timeouts || 0),
          best_streak: Number(state.bestStreak || 0),
          average_answer_time: totalSetsPlayed ? Number(state.totalAnswerMs || 0) / totalSetsPlayed / 1000 : 0,
          total_time_seconds: Math.max(0, Math.round(totalMs / 1000)),
        });
        if (response?.attempt_id) {
          VocabularyOddOneOutState.set({ analyticsAttemptId: Number(response.attempt_id) });
        }
      } catch (error) {
        console.error("Odd One Out analytics save error:", error);
      }
    });
    return analyticsSavePromise;
  };
})();
