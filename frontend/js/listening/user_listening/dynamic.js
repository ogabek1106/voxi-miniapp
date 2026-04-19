// frontend/js/user_reading/dynamic.js
window.UserListening = window.UserListening || {};

UserListening.renderTest = function (container, data) {
  UserListening.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Listening Test";
  if (!content) return;

  UserListening.__mockId = data?.mock_id || null;
  UserListening.__isSubmitted = false;

  let nextQuestionNumber = 1;

  content.innerHTML =
    ((data.sections || data.passages) || [])
      .map((section, sectionIndex) => {
        const sectionHtml = UserListening.renderPassage(
          section,
          sectionIndex,
          nextQuestionNumber
        );

        nextQuestionNumber += section?.questions?.length || 0;
        return sectionHtml;
      })
      .join("") +
    UserListening.renderSubmitSection();

  UserListening.initHeader(data);
  UserListening.restoreProgress(data);
  UserListening.initAutoSave(data);
};

UserListening.renderPassage = function (section, sectionIndex, startingQuestionNumber = 1) {
  return `
    ${UserListening.renderSectionView(section, sectionIndex)}
    ${UserListening.renderQuestionsForSection(section, sectionIndex, startingQuestionNumber)}
  `;
};

UserListening.applyRestoredAnswers = function (answers) {
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

UserListening.setInputsDisabled = function (disabled) {
  const content = document.getElementById("reading-user-content");
  if (!content) return;

  const fields = content.querySelectorAll("input, select, textarea, button");
  fields.forEach((field) => {
    if (field.id === "reading-submit-btn") return;
    field.disabled = !!disabled;
  });
};

UserListening.markSubmittedState = function (message) {
  UserListening.__isSubmitted = true;
  UserListening.stopAutoSave();
  UserListening.setInputsDisabled(true);

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

UserListening.stopAutoSave = function () {
  if (UserListening.__autoSaveInterval) {
    clearInterval(UserListening.__autoSaveInterval);
    UserListening.__autoSaveInterval = null;
  }

  if (UserListening.__autoSaveContent && UserListening.__autoSaveInputHandler) {
    UserListening.__autoSaveContent.removeEventListener("input", UserListening.__autoSaveInputHandler);
    UserListening.__autoSaveContent.removeEventListener("change", UserListening.__autoSaveInputHandler);
  }
  UserListening.__autoSaveContent = null;
  UserListening.__autoSaveInputHandler = null;

  if (UserListening.__autoSaveVisibilityHandler) {
    document.removeEventListener("visibilitychange", UserListening.__autoSaveVisibilityHandler);
    UserListening.__autoSaveVisibilityHandler = null;
  }

  if (UserListening.__autoSavePageHideHandler) {
    window.removeEventListener("pagehide", UserListening.__autoSavePageHideHandler);
    UserListening.__autoSavePageHideHandler = null;
  }

  UserListening.__autoSaveDirty = false;
  UserListening.__autoSaveInFlight = false;
};

UserListening.initAutoSave = function (data) {
  const content = document.getElementById("reading-user-content");
  const mockId = data?.mock_id;

  if (!content || !mockId) return;

  UserListening.stopAutoSave();
  UserListening.__autoSaveDirty = false;
  UserListening.__autoSaveInFlight = false;
  UserListening.__autoSaveContent = content;

  async function flush(keepalive = false) {
    if (UserListening.__isSubmitted || !UserListening.__autoSaveDirty || UserListening.__autoSaveInFlight) {
      return;
    }

    UserListening.__autoSaveInFlight = true;
    try {
      await UserListening.saveProgress(mockId, { keepalive });
      UserListening.__autoSaveDirty = false;
      if (!keepalive && typeof UserListening.showAutosaveBadge === "function") {
        UserListening.showAutosaveBadge("Saved!");
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      UserListening.__autoSaveInFlight = false;
    }
  }

  UserListening.__autoSaveInputHandler = function () {
    if (UserListening.__isSubmitted) return;
    UserListening.__autoSaveDirty = true;
  };

  content.addEventListener("input", UserListening.__autoSaveInputHandler);
  content.addEventListener("change", UserListening.__autoSaveInputHandler);

  UserListening.__autoSaveInterval = setInterval(() => {
    flush(false);
  }, 5000);

  UserListening.__autoSaveVisibilityHandler = function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  };
  document.addEventListener("visibilitychange", UserListening.__autoSaveVisibilityHandler);

  UserListening.__autoSavePageHideHandler = function () {
    flush(true);
  };
  window.addEventListener("pagehide", UserListening.__autoSavePageHideHandler);
};

UserListening.restoreProgress = async function (data) {
  const mockId = data?.mock_id;
  if (!mockId) return;

  try {
    const progress = await UserListening.loadProgress(mockId);
    const answers = progress?.answers || {};

    UserListening.applyRestoredAnswers(answers);

    if (typeof UserListening.__updateQuestionProgress === "function") {
      UserListening.__updateQuestionProgress();
    }

    if (progress?.is_submitted) {
      UserListening.markSubmittedState("You have already completed this reading test.");
    }
  } catch (error) {
    console.error("Failed to restore progress:", error);
  }
};

window.UserListening = window.UserListening || {};

UserListening.showResultScreen = function (data = {}) {
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

  UserListening.renderResultPage(container, {
    band: data.band ?? "0.0",
    correct: data.correct ?? 0,
    total: data.total ?? 40,
    backTarget: data.backTarget === "profile" ? "profile" : "home"
  });
};
