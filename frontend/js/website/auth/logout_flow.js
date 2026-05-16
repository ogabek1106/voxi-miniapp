window.WebsiteLogoutFlow = window.WebsiteLogoutFlow || {};

(function () {
  function safeCall(callback) {
    try {
      callback?.();
    } catch (error) {
      console.warn("[Logout] cleanup skipped", error);
    }
  }

  function clearWritingState() {
    const state = window.UserWritingState?.get?.();
    if (!state) return;

    if (state.autoSaveInterval) clearInterval(state.autoSaveInterval);
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.visibilityHandler) document.removeEventListener("visibilitychange", state.visibilityHandler);
    if (state.pageHideHandler) window.removeEventListener("pagehide", state.pageHideHandler);

    window.UserWritingState.set({
      mockId: null,
      testId: null,
      autoSaveDirty: false,
      autoSaveInFlight: false,
      autoSaveInterval: null,
      timerInterval: null,
      visibilityHandler: null,
      pageHideHandler: null
    });
  }

  function clearActiveWork() {
    window.__activeExamPart = null;

    safeCall(() => window.MockFlow?.deactivate?.());
    safeCall(() => window.UserListening?.cancelListeningPlayback?.());
    safeCall(() => window.UserSpeakingState?.reset?.());
    safeCall(clearWritingState);
    safeCall(() => window.VocabularyOddOneOutGame?.stopTimers?.());
    safeCall(() => window.WordShuffleEngine?.stop?.());
    safeCall(() => window.WordShuffleTimer?.stop?.());
    safeCall(() => window.ShadowWritingTyping?.cleanup?.());

    document.body.classList.remove(
      "vocab-ooo-active",
      "word-shuffle-active",
      "word-merge-active",
      "shadow-writing-active"
    );
  }

  async function clearAuthSession() {
    if (window.WebsiteAuthState?.logout) {
      await window.WebsiteAuthState.logout();
      return;
    }
    window.WebsiteAuthState?.setUser?.(null);
  }

  window.WebsiteLogoutFlow.run = async function () {
    clearActiveWork();

    try {
      await clearAuthSession();
    } catch (error) {
      console.warn("[Logout] backend logout failed, clearing local session", error);
      window.WebsiteAuthState?.setUser?.(null);
    }

    window.WebsiteProfileSheet?.close?.();
    window.WebsiteHeader?.render?.();
    window.VoxiActivity?.endSession?.();

    if (typeof window.goHome === "function") {
      window.goHome();
    }
    window.VoxiActivity?.ping?.();
  };
})();
