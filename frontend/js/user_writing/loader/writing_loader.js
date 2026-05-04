window.UserWritingLoader = window.UserWritingLoader || {};

UserWritingLoader.mount = function (container, data) {
  UserWritingUI.renderShell(container);

  const content = document.getElementById("writing-user-content");
  if (!content) return;

  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const progress = data?.progress || {};
  content.innerHTML = `
    ${tasks.map((task) => UserWritingUI.renderTaskCard(task, progress)).join("")}
    ${UserWritingUI.renderSubmit()}
  `;

  const taskCards = Array.from(content.querySelectorAll(".writing-user-task"));
  taskCards.forEach((card) => UserWritingUI.bindAnswerUpload(card));

  UserWritingLoader.bindEvents(data);
  UserWritingUI.initTimer(data?.timer, data);
  UserWritingLoader.initAutoSave(data);

  if (data?.already_submitted || progress?.is_submitted) {
    UserWritingLoader.markSubmitted();
  }
};

UserWritingLoader.bindEvents = function (data) {
  const backBtn = document.getElementById("writing-back-btn");
  const submitBtn = document.getElementById("writing-submit-btn");
  const content = document.getElementById("writing-user-content");

  if (backBtn) {
    backBtn.onclick = async function () {
      const exitToHome = async function () {
        try {
          const state = UserWritingState.get();
          if (!state.isSubmitted) {
            const answers = UserWritingUI.readAnswers();
            await UserWritingApi.save(state.mockId, answers, { keepalive: true });
          }
        } catch (_) {}

        if (typeof window.goHome === "function") {
          window.goHome();
        }
      };

      if (window.ExamExitGuard?.confirmExit && !UserWritingState.get().isSubmitted) {
        window.ExamExitGuard.confirmExit(exitToHome);
        return;
      }

      exitToHome();
    };
  }

  if (content) {
    const markDirty = function () {
      if (UserWritingState.get().isSubmitted) return;
      UserWritingState.set({ autoSaveDirty: true });
    };
    content.addEventListener("input", markDirty);
    content.addEventListener("change", markDirty);
  }

  if (submitBtn) {
    submitBtn.onclick = async function () {
      if (UserWritingState.get().isSubmitted) return;
      const ok = confirm("Are you sure you want to submit your writing? You cannot edit after submission.");
      if (!ok) return;
      await UserWritingLoader.submit("manual");
    };
  }
};

UserWritingLoader.initAutoSave = function (data) {
  const state = UserWritingState.get();
  if (state.autoSaveInterval) {
    clearInterval(state.autoSaveInterval);
  }
  if (state.visibilityHandler) {
    document.removeEventListener("visibilitychange", state.visibilityHandler);
  }
  if (state.pageHideHandler) {
    window.removeEventListener("pagehide", state.pageHideHandler);
  }

  const flush = async function (keepalive = false) {
    const s = UserWritingState.get();
    if (s.isSubmitted || !s.autoSaveDirty || s.autoSaveInFlight) return;

    UserWritingState.set({ autoSaveInFlight: true });
    try {
      const answers = UserWritingUI.readAnswers();
      await UserWritingApi.save(s.mockId, answers, { keepalive });
      UserWritingState.set({ autoSaveDirty: false });
      if (!keepalive) {
        UserWritingUI.showAutosaveBadge("Saved!");
      }
    } catch (error) {
      console.error("Writing autosave failed:", error);
    } finally {
      UserWritingState.set({ autoSaveInFlight: false });
    }
  };

  const interval = setInterval(() => flush(false), 5000);
  UserWritingState.set({ autoSaveInterval: interval });

  const visibilityHandler = function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);

  const pageHideHandler = function () {
    flush(true);
  };
  window.addEventListener("pagehide", pageHideHandler);

  UserWritingState.set({
    visibilityHandler,
    pageHideHandler
  });
};

UserWritingLoader.submit = async function (finishType = "manual") {
  window.MockDebug?.log?.("Writing.submit.enter", {
    finishType
  });
  const submitBtn = document.getElementById("writing-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = finishType === "auto" ? "Auto submitting..." : "Submitting...";
  }

  try {
    const state = UserWritingState.get();
    const answers = UserWritingUI.readAnswers();
    window.MockDebug?.log?.("Writing.submit.state", {
      mockId: state?.mockId,
      isSubmitted: state?.isSubmitted
    });

    const isFullMockFlow = !!window.MockFlow?.isActive?.(state.mockId);
    window.MockDebug?.log?.("Writing.submit.isFullMockFlow", {
      isFullMockFlow,
      mockId: state?.mockId
    });
    if (isFullMockFlow) {
      UserWritingLoader.markSubmitted(false);
      window.MockDebug?.log?.("Writing.submit.markSubmittedForFlow");

      // Do not block transition UI on backend latency.
      (async function submitInBackground() {
        try {
          window.MockDebug?.log?.("Writing.submit.background.start");
          await UserWritingApi.save(state.mockId, answers);
          await UserWritingApi.submit(state.mockId, answers, finishType);
          window.MockDebug?.log?.("Writing.submit.background.done");
        } catch (backgroundError) {
          console.error("Writing background submit failed:", backgroundError);
          window.MockDebug?.log?.("Writing.submit.background.error", {
            message: backgroundError?.message || String(backgroundError)
          });
        }
      })();

      const flowMoved = window.MockFlow?.goToNextPart?.(
        "writing",
        state.mockId,
        document.getElementById("screen-writing")
      );
      window.MockDebug?.log?.("Writing.submit.goToNextPart.result", { flowMoved });
      if (flowMoved) {
        return;
      }

      return;
    }

    await UserWritingApi.save(state.mockId, answers);
    await UserWritingApi.submit(state.mockId, answers, finishType);
    UserWritingLoader.markSubmitted(false);
    window.MockDebug?.log?.("Writing.submit.nonFlow.submitDone");

    const flowMoved = window.MockFlow?.goToNextPart?.(
      "writing",
      state.mockId,
      document.getElementById("screen-writing")
    );
    if (flowMoved) {
      return;
    }

    try {
      await UserWritingLoader.runAiCheckAndShowResult(state.mockId);
    } catch (checkError) {
      console.error("Writing AI check failed:", checkError);
      alert("Writing submitted. Result is still being checked.");
      if (typeof window.goHome === "function") {
        window.goHome();
      }
    }
  } catch (error) {
    console.error("Writing submit failed:", error);
    window.MockDebug?.log?.("Writing.submit.error", {
      message: error?.message || String(error)
    });
    alert("Failed to submit writing");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Writing";
    }
  }
};

UserWritingLoader.markSubmitted = function (showAlert = true) {
  const state = UserWritingState.get();
  if (state.autoSaveInterval) {
    clearInterval(state.autoSaveInterval);
  }
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  UserWritingState.set({
    isSubmitted: true,
    autoSaveInterval: null,
    timerInterval: null,
    autoSaveDirty: false
  });

  if (state.visibilityHandler) {
    document.removeEventListener("visibilitychange", state.visibilityHandler);
  }
  if (state.pageHideHandler) {
    window.removeEventListener("pagehide", state.pageHideHandler);
  }
  UserWritingState.set({
    visibilityHandler: null,
    pageHideHandler: null
  });

  UserWritingUI.setLocked(true);
  const submitBtn = document.getElementById("writing-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitted";
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "not-allowed";
  }
  if (showAlert) {
    alert("Writing submitted.");
  }
};

UserWritingLoader.runAiCheckAndShowResult = async function (mockId) {
  const target = document.getElementById("screen-writing");
  if (!target) return;

  UserWritingUI.renderChecking(target);

  const result = await UserWritingApi.check(mockId);
  const band = Number(result?.overall_writing_band || 0);

  if (window.UserReading?.renderResultPage) {
    target.innerHTML = "";
    window.UserReading.renderResultPage(target, {
      sectionType: "writing",
      overallLabel: "IELTS Writing",
      band,
      hideScore: true,
      backTarget: "home"
    });
    return;
  }

  alert(`Writing Band: ${band.toFixed(1)}`);
  if (typeof window.goHome === "function") {
    window.goHome();
  }
};

UserWritingLoader.start = async function (mockId, container) {
  const target = container || document.getElementById("screen-writing");
  if (!target) return;

  UserWritingUI.renderLoading(target);

  try {
    const data = await UserWritingApi.start(mockId);
    UserWritingState.set({
      mockId: Number(mockId),
      testId: Number(data?.test_id || 0) || null,
      isSubmitted: false,
      autoSaveDirty: false,
      autoSaveInFlight: false
    });
    if (data?.already_submitted) {
      await UserWritingLoader.runAiCheckAndShowResult(Number(mockId));
      return;
    }

    UserWritingLoader.mount(target, data || {});
  } catch (error) {
    console.error(error);
    UserWritingUI.renderError(target, error);
  }
};
