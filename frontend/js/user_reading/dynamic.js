// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  UserReading.startTimer(data?.timer);
  if (!content) return;

  content.innerHTML = (data.passages || [])
    .map((passage, pi) => UserReading.renderPassage(passage, pi))
    .join("");
};

UserReading.startTimer = function (timer) {
  const timerEl = document.getElementById("reading-user-timer");
  if (!timerEl) return;

  if (window.__userReadingTimer) {
    clearInterval(window.__userReadingTimer);
  }

  const endsAt = timer?.ends_at ? new Date(timer.ends_at).getTime() : null;
  if (!endsAt) {
    timerEl.textContent = "--:--";
    return;
  }

  function tick() {
    const leftMs = Math.max(0, endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const min = Math.floor(leftSec / 60).toString().padStart(2, "0");
    const sec = (leftSec % 60).toString().padStart(2, "0");

    timerEl.textContent = `${min}:${sec}`;

    if (leftSec <= 0 && window.__userReadingTimer) {
      clearInterval(window.__userReadingTimer);
      window.__userReadingTimer = null;
    }
  }

  tick();
  window.__userReadingTimer = setInterval(tick, 1000);
};

UserReading.renderPassage = function (passage, passageIndex) {
  const image = passage.image_url
    ? `<img src="${window.API}${passage.image_url}" style="width:100%; max-width:100%; border-radius:8px; margin:10px 0;" />`
    : "";

  return `
    <section class="reading-passage" style="margin-bottom:24px; text-align:left;">
      <h4>Passage ${passageIndex + 1}</h4>
      ${passage.title ? `<h5>${UserReading.escapeHtml(passage.title)}</h5>` : ""}
      ${image}
      <p style="white-space:pre-wrap; line-height:1.5;">
        ${UserReading.escapeHtml(passage.text || "")}
      </p>

      <div class="reading-questions">
        ${(passage.questions || []).map((q, qi) => UserReading.renderQuestion(q, qi)).join("")}
      </div>
    </section>
  `;
};

UserReading.renderQuestion = function (question, index) {
  const number = question.order_index || index + 1;
  const type = question.type;
  const text = question.content?.text || "";

  return `
    <div class="reading-question" data-question-id="${question.id}" data-question-type="${UserReading.escapeHtml(type)}" style="
      margin:12px 0;
      padding:12px;
      border-radius:8px;
      background:var(--card-bg, #f4f4f6);
    ">
      <div style="font-weight:700; margin-bottom:6px;">Q${number}</div>
      ${text ? `<div style="margin-bottom:8px;">${UserReading.escapeHtml(text)}</div>` : ""}
      ${UserReading.renderAnswerInput(question)}
    </div>
  `;
};

UserReading.renderAnswerInput = function (question) {
  if (question.type === "SINGLE_CHOICE") {
    const options = question.meta?.options || [];
    return options.map((option, index) => {
      const key = String.fromCharCode(65 + index);
      return `
        <label style="display:block; margin:6px 0;">
          <input type="radio" name="q_${question.id}" value="${key}" />
          ${key}. ${UserReading.escapeHtml(option)}
        </label>
      `;
    }).join("");
  }

  if (question.type === "MULTI_CHOICE") {
    const options = question.content?.options || [];
    return options.map((option) => `
      <label style="display:block; margin:6px 0;">
        <input type="checkbox" name="q_${question.id}" value="${UserReading.escapeHtml(option.key)}" />
        ${UserReading.escapeHtml(option.key)}. ${UserReading.escapeHtml(option.text)}
      </label>
    `).join("");
  }

  if (question.type === "TFNG") {
    return UserReading.renderSelect(question.id, ["TRUE", "FALSE", "NOT_GIVEN"]);
  }

  if (question.type === "YES_NO_NG") {
    return UserReading.renderSelect(question.id, ["YES", "NO", "NOT_GIVEN"]);
  }

  return `
    <input
      name="q_${question.id}"
      placeholder="Type your answer..."
      style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box;"
    />
  `;
};

UserReading.renderSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;">
      <option value="">Choose answer</option>
      ${options.map(option => `<option value="${option}">${option.replace("_", " ")}</option>`).join("")}
    </select>
  `;
};
