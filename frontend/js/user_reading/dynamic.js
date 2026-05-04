// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  if (!content) return;

  UserReading.__mockId = data?.mock_id || null;
  UserReading.__isSubmitted = false;

  let nextQuestionNumber = 1;

  content.innerHTML =
    (data.passages || [])
      .map((passage, passageIndex) => {
        const passageHtml = UserReading.renderPassage(
          passage,
          passageIndex,
          nextQuestionNumber
        );

        nextQuestionNumber += passage?.questions?.length || 0;
        return passageHtml;
      })
      .join("") +
    UserReading.renderSubmitSection();

  UserReading.initHeader(data);
  UserReading.restoreProgress(data);
  UserReading.initAutoSave(data);
};

UserReading.renderPassage = function (passage, passageIndex, startingQuestionNumber = 1) {
  return `
    ${UserReading.renderPassageView(passage, passageIndex)}
    ${UserReading.renderQuestionsForPassage(passage, passageIndex, startingQuestionNumber)}
  `;
};

UserReading.applyRestoredAnswers = function (answers) {
  Object.keys(answers || {}).forEach((qid) => {
    const entry = answers[qid];
    const value = entry?.value;

    const fields = Array.from(
      document.querySelectorAll(
        `[name="q_${qid}"], [name^="q_${qid}_"], [data-qid="${qid}"]`
      )
    );

    if (!fields.length) return;

    const first = fields[0];
    const type = String(first.type || "").toLowerCase();
    const tag = String(first.tagName || "").toLowerCase();

    if (type === "radio") {
      fields.forEach((field) => {
        field.checked = String(field.value) === String(value);
      });
      return;
    }

    if (type === "checkbox") {
      const selected = Array.isArray(value) ? value.map(String) : [];
      fields.forEach((field) => {
        field.checked = selected.includes(String(field.value));
      });
      return;
    }

    if (tag === "select") {
      first.value = value == null ? "" : String(value);
      return;
    }

    first.value = value == null ? "" : String(value);
  });
};

UserReading.setInputsDisabled = function (disabled) {
  const content = document.getElementById("reading-user-content");
  if (!content) return;

  const fields = content.querySelectorAll("input, select, textarea, button");
  fields.forEach((field) => {
    if (field.id === "reading-submit-btn") return;
    field.disabled = !!disabled;
  });
};

UserReading.markSubmittedState = function (message) {
  UserReading.__isSubmitted = true;
  UserReading.stopAutoSave();
  UserReading.setInputsDisabled(true);

  const button = document.getElementById("reading-submit-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Submitted";
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";
  }

  if (message) {
    alert(message);
  }
};

UserReading.stopAutoSave = function () {
  if (UserReading.__autoSaveInterval) {
    clearInterval(UserReading.__autoSaveInterval);
    UserReading.__autoSaveInterval = null;
  }

  if (UserReading.__autoSaveContent && UserReading.__autoSaveInputHandler) {
    UserReading.__autoSaveContent.removeEventListener("input", UserReading.__autoSaveInputHandler);
    UserReading.__autoSaveContent.removeEventListener("change", UserReading.__autoSaveInputHandler);
  }
  UserReading.__autoSaveContent = null;
  UserReading.__autoSaveInputHandler = null;

  if (UserReading.__autoSaveVisibilityHandler) {
    document.removeEventListener("visibilitychange", UserReading.__autoSaveVisibilityHandler);
    UserReading.__autoSaveVisibilityHandler = null;
  }

  if (UserReading.__autoSavePageHideHandler) {
    window.removeEventListener("pagehide", UserReading.__autoSavePageHideHandler);
    UserReading.__autoSavePageHideHandler = null;
  }

  UserReading.__autoSaveDirty = false;
  UserReading.__autoSaveInFlight = false;
};

UserReading.initAutoSave = function (data) {
  const content = document.getElementById("reading-user-content");
  const mockId = data?.mock_id;

  if (!content || !mockId) return;

  UserReading.stopAutoSave();
  UserReading.__autoSaveDirty = false;
  UserReading.__autoSaveInFlight = false;
  UserReading.__autoSaveContent = content;

  async function flush(keepalive = false) {
    if (UserReading.__isSubmitted || !UserReading.__autoSaveDirty || UserReading.__autoSaveInFlight) {
      return;
    }

    UserReading.__autoSaveInFlight = true;
    try {
      await UserReading.saveProgress(mockId, { keepalive });
      UserReading.__autoSaveDirty = false;
      if (!keepalive && typeof UserReading.showAutosaveBadge === "function") {
        UserReading.showAutosaveBadge("Saved!");
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      UserReading.__autoSaveInFlight = false;
    }
  }

  UserReading.__autoSaveInputHandler = function () {
    if (UserReading.__isSubmitted) return;
    UserReading.__autoSaveDirty = true;
  };

  content.addEventListener("input", UserReading.__autoSaveInputHandler);
  content.addEventListener("change", UserReading.__autoSaveInputHandler);

  UserReading.__autoSaveInterval = setInterval(() => {
    flush(false);
  }, 5000);

  UserReading.__autoSaveVisibilityHandler = function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  };
  document.addEventListener("visibilitychange", UserReading.__autoSaveVisibilityHandler);

  UserReading.__autoSavePageHideHandler = function () {
    flush(true);
  };
  window.addEventListener("pagehide", UserReading.__autoSavePageHideHandler);
};

UserReading.restoreProgress = async function (data) {
  const mockId = data?.mock_id;
  if (!mockId) return;

  try {
    const progress = await UserReading.loadProgress(mockId);
    const answers = progress?.answers || {};

    UserReading.applyRestoredAnswers(answers);

    if (typeof UserReading.__updateQuestionProgress === "function") {
      UserReading.__updateQuestionProgress();
    }

    if (progress?.is_submitted) {
      UserReading.markSubmittedState("You have already completed this reading test.");
    }
  } catch (error) {
    console.error("Failed to restore progress:", error);
  }
};

window.UserReading = window.UserReading || {};

UserReading.showResultScreen = function (data = {}) {
  const container = document.getElementById("screen-reading");
  if (!container) return;

  const home = document.getElementById("screen-home");
  const profile = document.getElementById("screen-profile");
  const mocks = document.getElementById("screen-mocks");
  const admin = document.getElementById("screen-admin");

  if (home) home.style.display = "none";
  if (profile) profile.style.display = "none";
  if (mocks) mocks.style.display = "none";
  if (admin) admin.style.display = "none";

  container.style.display = "block";
  container.innerHTML = "";

  UserReading.renderResultPage(container, {
    sectionType: "reading",
    overallLabel: "IELTS Reading",
    band: data.band ?? "0.0",
    correct: data.correct ?? 0,
    total: data.total ?? 40,
    backTarget: data.backTarget === "profile" ? "profile" : "home"
  });
};
