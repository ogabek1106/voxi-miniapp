// frontend/js/user_reading/core/answers.js

window.UserReading = window.UserReading || {};

UserReading.getQuestionIdFromField = function (field) {
  if (!field) return null;

  const explicit = Number(field.getAttribute("data-qid"));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const name = String(field.name || "");
  const match = name.match(/^q_(\d+)/);
  return match ? Number(match[1]) : null;
};

UserReading.collectAnswers = function () {
  const content = document.getElementById("reading-user-content");
  if (!content) return {};

  const fields = Array.from(
    content.querySelectorAll('input[name^="q_"], select[name^="q_"], textarea[name^="q_"]')
  );

  const grouped = new Map();

  fields.forEach((field) => {
    const qid = UserReading.getQuestionIdFromField(field);
    if (!qid) return;

    if (!grouped.has(qid)) {
      grouped.set(qid, []);
    }

    grouped.get(qid).push(field);
  });

  const answers = {};

  grouped.forEach((controls, qid) => {
    if (!controls || !controls.length) return;

    const first = controls[0];
    const type = (first.type || "").toLowerCase();
    const tag = (first.tagName || "").toLowerCase();

    if (type === "radio") {
      const checked = controls.find((c) => c.checked);
      answers[String(qid)] = {
        value: checked ? String(checked.value) : ""
      };
      return;
    }

    if (type === "checkbox") {
      const checkedValues = controls
        .filter((c) => c.checked)
        .map((c) => String(c.value));
      answers[String(qid)] = {
        value: checkedValues
      };
      return;
    }

    if (tag === "select") {
      answers[String(qid)] = {
        value: String(first.value || "")
      };
      return;
    }

    const typedValues = controls
      .map((control) => String(control.value || "").trim())
      .filter((value) => value.length > 0);

    answers[String(qid)] = {
      value: typedValues.length > 0 ? typedValues[0] : ""
    };
  });

  return answers;
};

UserReading.getAnsweredQuestionIds = function () {
  const answers = UserReading.collectAnswers();
  return Object.keys(answers).filter((qid) => {
    const value = answers[qid]?.value;

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return String(value || "").trim().length > 0;
  });
};
UserReading.collectSaveableAnswers = function () {
  const answers = UserReading.collectAnswers();
  const result = {};

  Object.keys(answers).forEach((qid) => {
    const value = answers[qid]?.value;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        result[qid] = { value };
      }
      return;
    }

    if (String(value || "").trim().length > 0) {
      result[qid] = { value: String(value).trim() };
    }
  });

  return result;
};
