// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  if (!content) return;

  let nextQuestionNumber = 1;

    content.innerHTML =
    (data.passages || [])
      .map((passage, pi) => {
        const passageHtml = UserReading.renderPassage(
          passage,
          pi,
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

UserReading.initAutoSave = function (data) {
  const content = document.getElementById("reading-user-content");
  const mockId = data?.mock_id;

  if (!content || !mockId) return;

  // clear old listeners if re-render
  if (UserReading.__autoSaveHandler) {
    content.removeEventListener("input", UserReading.__autoSaveHandler);
    content.removeEventListener("change", UserReading.__autoSaveHandler);
  }

  let timeout = null;

  function triggerSave() {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      UserReading.saveProgress(mockId);
    }, 800); // debounce
  }

  UserReading.__autoSaveHandler = triggerSave;

  content.addEventListener("input", triggerSave);
  content.addEventListener("change", triggerSave);
};

UserReading.restoreProgress = async function (data) {
  const mockId = data?.mock_id;
  if (!mockId) return;

  try {
    const progress = await UserReading.loadProgress(mockId);
    const answers = progress?.answers || {};

    Object.keys(answers).forEach((qid) => {
      const entry = answers[qid];
      const value = entry?.value;

      const fields = Array.from(
        document.querySelectorAll(
          `[name="q_${qid}"], [data-qid="${qid}"]`
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

    if (typeof UserReading.__updateQuestionProgress === "function") {
      UserReading.__updateQuestionProgress();
    }
  } catch (error) {
    console.error("Failed to restore progress:", error);
  }
};
