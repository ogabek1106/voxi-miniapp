window.VocabularyOddOneOutGame = window.VocabularyOddOneOutGame || {};

(function () {
  const QUESTION_SECONDS = 10;
  const EXPLANATION_SECONDS = 12;
  let questionTimerId = null;
  let explanationTimerId = null;
  let cleanupTimerId = null;

  function clearTimer(id) {
    if (id) clearInterval(id);
  }

  function stopCleanupTimer() {
    if (cleanupTimerId) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
  }

  VocabularyOddOneOutGame.stopTimers = function () {
    clearTimer(questionTimerId);
    clearTimer(explanationTimerId);
    questionTimerId = null;
    explanationTimerId = null;
    stopCleanupTimer();
  };

  VocabularyOddOneOutGame.exit = function () {
    VocabularyOddOneOutGame.stopTimers();
    if (typeof goHome === "function") goHome();
  };

  VocabularyOddOneOutGame.startQuestionTimer = function () {
    VocabularyOddOneOutGame.stopTimers();
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
    clearTimer(explanationTimerId);
    let remaining = EXPLANATION_SECONDS;
    VocabularyOddOneOutUI.renderTimer({ seconds: remaining, mode: "explanation" });
    explanationTimerId = setInterval(() => {
      remaining -= 1;
      VocabularyOddOneOutUI.renderTimer({ seconds: remaining, mode: "explanation" });
      if (remaining <= 0) {
        clearTimer(explanationTimerId);
        explanationTimerId = null;
      }
    }, 1000);
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
      VocabularyOddOneOutState.set({
        correct: state.correct + (result.correct ? 1 : 0),
        streak: nextStreak,
        comboBreak: !result.correct && state.streak >= 3 ? state.streak : null,
        lastResult: result,
      });
      VocabularyOddOneOutUI.renderFeedback({
        selectedWordId,
        correct: Boolean(result.correct),
        correctWordId: result.correct_word_id,
        explanation: result.explanation,
        timedOut: false,
      });
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
      });
      VocabularyOddOneOutUI.renderFeedback({
        selectedWordId: null,
        correct: false,
        correctWordId: result.correct_word_id,
        explanation: result.explanation,
        timedOut: true,
      });
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
})();
