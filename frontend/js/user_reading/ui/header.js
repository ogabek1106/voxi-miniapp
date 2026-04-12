// frontend/js/user_reading/ui/header.js

window.UserReading = window.UserReading || {};

UserReading.renderHeader = function () {
  return `
    <div id="reading-header" style="
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg-color, #fff);
      padding: 4px 8px;
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        height: 30px;
      ">
        <div id="header-timer" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 6px;
          background: #e5e5ea;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        ">
          <div id="timer-fill" style="
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background: #0ea5e9;
            transition: width 1s linear;
          "></div>
          <span id="timer-text" style="
            position: relative;
            z-index: 2;
            color: #fff;
          ">60:00</span>
        </div>

        <div id="header-passage" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 6px;
          background: #f4f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          user-select: none;
        ">
          <span id="passage-text">Passage 1</span>
          <div id="passage-dropdown" style="
            display: none;
            position: absolute;
            top: 34px;
            left: 0;
            right: 0;
            z-index: 200;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          "></div>
        </div>

        <div id="header-questions" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 6px;
          background: #e5e5ea;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        ">
          <div id="questions-fill" style="
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 0%;
            background: #ef4444;
            transition: width 0.25s ease, background 0.25s ease;
          "></div>
          <span id="questions-text" style="
            position: relative;
            z-index: 2;
            color: #111;
          ">0/0</span>
        </div>
      </div>

      <button
        type="button"
        onclick="UserReading.goBack()"
        aria-label="Back"
        style="
          position: fixed;
          left: 10px;
          bottom: 20px;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: #f4f4f6;
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 14px rgba(0,0,0,0.16);
          cursor: pointer;
          z-index: 140;
        "
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M9 5L3.5 11L9 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M4.5 11H17.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>
        </svg>
      </button>

      <button
        type="button"
        id="reading-mark-toggle"
        aria-label="Toggle mark mode"
        style="
          position: fixed;
          right: 10px;
          bottom: 20px;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: #f4f4f6;
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 14px rgba(0,0,0,0.16);
          cursor: pointer;
          z-index: 140;
        "
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M13.8 3.4L16.6 6.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M5 15L7.8 14.4L15.9 6.3C16.3 5.9 16.3 5.2 15.9 4.8L15.2 4.1C14.8 3.7 14.1 3.7 13.7 4.1L5.6 12.2L5 15Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        </svg>
      </button>
                
    </div>
  `;
};

UserReading.renderSubmitSection = function () {
  return `
    <div id="reading-submit-section" style="
  margin-top: 12px;
  padding: 0 8px 8px 8px;
">
      <button
        type="button"
        id="reading-submit-btn"
        aria-label="Submit reading"
        style="
          width: 100%;
          height: 46px;
          border: 0;
          border-radius: 12px;
          background: #111827;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 5px 14px rgba(0,0,0,0.16);
          cursor: pointer;
        "
      >
        Submit
      </button>
    </div>
  `;
};

UserReading.goBack = function () {
  if (UserReading.__mockId && !UserReading.__isSubmitted && typeof UserReading.saveProgress === "function") {
    UserReading.saveProgress(UserReading.__mockId, { keepalive: true }).catch(() => {});
  }

  if (typeof window.goHome === "function") {
    window.goHome();
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  if (typeof window.goHome === "function") {
    window.goHome();
  }
};

UserReading.showAutosaveBadge = function (text = "Saved!") {
  const header = document.getElementById("reading-header");
  if (!header) return;

  let badge = document.getElementById("reading-autosave-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "reading-autosave-badge";
    badge.style.position = "absolute";
    badge.style.top = "36px";
    badge.style.left = "50%";
    badge.style.transform = "translateX(-50%)";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "999px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "700";
    badge.style.color = "#ffffff";
    badge.style.background = "#16a34a";
    badge.style.boxShadow = "0 6px 14px rgba(0,0,0,0.16)";
    badge.style.opacity = "0";
    badge.style.pointerEvents = "none";
    badge.style.transition = "opacity 0.2s ease";
    badge.style.zIndex = "160";
    header.appendChild(badge);
  }

  badge.textContent = text;
  badge.style.opacity = "1";

  if (UserReading.__autosaveBadgeTimer) {
    clearTimeout(UserReading.__autosaveBadgeTimer);
  }
  UserReading.__autosaveBadgeTimer = setTimeout(() => {
    badge.style.opacity = "0";
  }, 1200);
};

UserReading.isIOS = function () {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
};

UserReading.applyHighlight = function (range) {
  if (!range || range.collapsed) return;

  const span = document.createElement("span");
  span.className = "highlight";

  try {
    range.surroundContents(span);
  } catch (error) {
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
  }
};

UserReading.initHeader = function (data) {
  UserReading.__timerAutoSubmitted = false;
  UserReading.initReadingTimer(data?.timer, data);
  UserReading.initPassageCounter();
  UserReading.initQuestionCounter();
  UserReading.initSubmitButton();

  if (UserReading.isIOS() && window.UserReadingIOS?.initMarkModeIOS) {
    window.UserReadingIOS.initMarkModeIOS();
    return;
  }

  UserReading.initMarkMode();
};
UserReading.initSubmitButton = function () {
  const button = document.getElementById("reading-submit-btn");
  if (!button) return;

  UserReading.setSubmitButtonLoading(false);

  button.onclick = function () {
    if (button.disabled) return;
    UserReading.handleSubmitAttempt();
  };
};
UserReading.setSubmitButtonLoading = function (isLoading) {
  const button = document.getElementById("reading-submit-btn");
  if (!button) return;

  button.disabled = !!isLoading;
  button.textContent = isLoading ? "Submitting..." : "Submit";
  button.style.opacity = isLoading ? "0.7" : "1";
  button.style.cursor = isLoading ? "not-allowed" : "pointer";
};

UserReading.mixColor = function (fromRgb, toRgb, ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * clamped);
  const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * clamped);
  const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

UserReading.initReadingTimer = function (timer, data) {
  const text = document.getElementById("timer-text");
  const fill = document.getElementById("timer-fill");
  if (!text || !fill) return;

  if (window.__userReadingTimer) {
    clearInterval(window.__userReadingTimer);
  }

  const configuredMinutes = Number(data?.time_limit_minutes || 60);
  const expectedDuration = Math.max(1, configuredMinutes) * 60;
  const fallbackDuration = expectedDuration;
  const serverDuration = Number(timer?.duration_seconds || timer?.total_seconds || 0);

  let duration = fallbackDuration;
  if (serverDuration > 0 && serverDuration >= fallbackDuration * 0.9) {
    duration = serverDuration;
  }

  const serverEndsAt = timer?.ends_at ? new Date(timer.ends_at).getTime() : NaN;
  const useServerEnd = Number.isFinite(serverEndsAt);
  const endsAt = useServerEnd ? serverEndsAt : Date.now() + duration * 1000;

  function tick() {
    const rawLeftSec = (endsAt - Date.now()) / 1000;
    const leftSec = Math.max(0, Math.min(duration, Math.ceil(rawLeftSec)));
    const minutes = String(Math.floor(leftSec / 60)).padStart(2, "0");
    const seconds = String(leftSec % 60).padStart(2, "0");
    const leftRatio = duration > 0 ? Math.max(0, Math.min(1, leftSec / duration)) : 0;
    const percent = leftRatio * 100;
    const elapsedRatio = 1 - leftRatio;

    text.textContent = `${minutes}:${seconds}`;
    fill.style.width = `${percent}%`;
    fill.style.background = UserReading.mixColor([34, 197, 94], [220, 38, 38], elapsedRatio);
    text.style.color = leftRatio > 0.35 ? "#ffffff" : "#111111";
    UserReading.__timerLeftSec = leftSec;

    document.dispatchEvent(new CustomEvent("userreading:timer-tick", {
      detail: {
        leftSec,
        durationSec: duration
      }
    }));

    if (leftSec <= 0) {
      clearInterval(window.__userReadingTimer);
      window.__userReadingTimer = null;

      if (!UserReading.__timerAutoSubmitted && !UserReading.__isSubmitted) {
        UserReading.__timerAutoSubmitted = true;
        UserReading.submitReading({ auto: true });
      }
    }
  }

  tick();
  window.__userReadingTimer = setInterval(tick, 1000);
};

UserReading.initPassageCounter = function () {
  const button = document.getElementById("header-passage");
  const label = document.getElementById("passage-text");
  const dropdown = document.getElementById("passage-dropdown");
  const content = document.getElementById("reading-user-content");
  const passages = Array.from(document.querySelectorAll(".passage-container"));

  if (!button || !label || !dropdown || !content || !passages.length) return;

  dropdown.innerHTML = passages.map((_, index) => `
    <button type="button" data-passage-target="${index}" style="
      width: 100%;
      border: 0;
      background: #fff;
      padding: 9px 8px;
      text-align: center;
      font-weight: 700;
      cursor: pointer;
    ">Passage ${index + 1}</button>
  `).join("");

  button.style.cursor = "pointer";

  button.onclick = function (event) {
    event.stopPropagation();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  };

  dropdown.onclick = function (event) {
    event.stopPropagation();

    const target = event.target.closest("[data-passage-target]");
    if (!target) return;

    const passage = passages[Number(target.dataset.passageTarget)];
    if (passage) {
      passage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    dropdown.style.display = "none";
  };

  if (UserReading.__closePassageDropdown) {
    document.removeEventListener("click", UserReading.__closePassageDropdown);
  }
  UserReading.__closePassageDropdown = function () {
    dropdown.style.display = "none";
  };
  document.addEventListener("click", UserReading.__closePassageDropdown);

  function updateActivePassage() {
    const headerBottom = document.getElementById("reading-header")?.getBoundingClientRect().bottom || 0;
    let activeIndex = 0;

    passages.forEach((passage, index) => {
      if (passage.getBoundingClientRect().top <= headerBottom + 24) {
        activeIndex = index;
      }
    });

    label.textContent = `Passage ${activeIndex + 1}`;
  }

  content.removeEventListener("scroll", UserReading.__updateActivePassage || function () {});
  UserReading.__updateActivePassage = updateActivePassage;
  content.addEventListener("scroll", updateActivePassage, { passive: true });
  updateActivePassage();
};

UserReading.initQuestionCounter = function () {
  const host = document.getElementById("header-questions");
  const text = document.getElementById("questions-text");
  const fill = document.getElementById("questions-fill");
  const content = document.getElementById("reading-user-content");
  if (!host || !text || !fill || !content) return;

  host.style.cursor = "pointer";
  host.style.overflow = "visible";
  fill.style.borderRadius = "6px";

  let dropdown = document.getElementById("questions-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "questions-dropdown";
    dropdown.style.display = "none";
    dropdown.style.position = "absolute";
    dropdown.style.top = "34px";
    dropdown.style.left = "0";
    dropdown.style.right = "0";
    dropdown.style.zIndex = "200";
    dropdown.style.background = "#ffffff";
    dropdown.style.border = "1px solid #ddd";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
    dropdown.style.maxHeight = "288px";
    dropdown.style.overflowY = "auto";
    host.appendChild(dropdown);
  }

  function getQuestionId(field) {
    const explicit = Number(field.getAttribute("data-qid"));
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const name = String(field.name || "");
    const match = name.match(/^q_(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function getQuestionAnchor(field) {
    return field.closest(".matching-row")
      || field.closest(".summary-inline-blank")
      || field.closest(".question-block")
      || field;
  }

  function fieldHasValue(field) {
    if (field.type === "radio" || field.type === "checkbox") {
      return !!field.checked;
    }
    return String(field.value || "").trim().length > 0;
  }

  function collectQuestions() {
    const fields = Array.from(content.querySelectorAll('[name^="q_"], [data-qid]'));
    const byId = new Map();

    fields.forEach((field) => {
      const qid = getQuestionId(field);
      if (!qid) return;

      if (!byId.has(qid)) {
        byId.set(qid, {
          qid,
          controls: [],
          anchor: getQuestionAnchor(field),
          order: byId.size + 1
        });
      }

      byId.get(qid).controls.push(field);
    });

    return Array.from(byId.values()).sort((a, b) => a.order - b.order);
  }

  function isAnswered(questionEntry) {
    const controls = questionEntry.controls || [];
    if (!controls.length) return false;

    const hasChoice = controls.some((field) =>
      field.type === "radio" || field.type === "checkbox"
    );

    if (hasChoice) {
      return controls.some((field) => field.checked);
    }

    return controls.some(fieldHasValue);
  }

  function buildDropdown(questions, answeredSet, lessThanTenMinLeft) {
    dropdown.innerHTML = questions.map((question) => {
      const answered = answeredSet.has(question.qid);
      const bg = answered
        ? "#dcfce7"
        : (lessThanTenMinLeft ? "#fee2e2" : "#f8fafc");
      const color = answered ? "#166534" : (lessThanTenMinLeft ? "#991b1b" : "#111827");
      return `
        <button type="button" data-question-order="${question.order}" style="
          width: 100%;
          border: 0;
          border-bottom: 1px solid #f1f5f9;
          background: ${bg};
          color: ${color};
          padding: 9px 10px;
          text-align: left;
          font-weight: 700;
          cursor: pointer;
        ">Question ${question.order}</button>
      `;
    }).join("");
  }

  function updateQuestionProgress() {
    const questions = collectQuestions();
    const total = questions.length;
    const answeredSet = new Set(
      questions.filter(isAnswered).map((question) => question.qid)
    );
    const solved = answeredSet.size;
    const ratio = total > 0 ? solved / total : 0;
    const percent = ratio * 100;
    const lessThanTenMinLeft = Number(UserReading.__timerLeftSec || 0) <= 10 * 60;

    text.textContent = `${solved}/${total}`;
    fill.style.width = `${percent}%`;
    fill.style.background = UserReading.mixColor([220, 38, 38], [34, 197, 94], ratio);
    buildDropdown(questions, answeredSet, lessThanTenMinLeft);
    UserReading.__questionList = questions;
  }

  host.onclick = function (event) {
    event.stopPropagation();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  };

  dropdown.onclick = function (event) {
    event.stopPropagation();
    const target = event.target.closest("[data-question-order]");
    if (!target) return;

    const order = Number(target.dataset.questionOrder);
    const question = (UserReading.__questionList || []).find((item) => item.order === order);
    if (question?.anchor) {
      question.anchor.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    dropdown.style.display = "none";
  };

  if (UserReading.__closeQuestionsDropdown) {
    document.removeEventListener("click", UserReading.__closeQuestionsDropdown);
  }
  UserReading.__closeQuestionsDropdown = function () {
    dropdown.style.display = "none";
  };
  document.addEventListener("click", UserReading.__closeQuestionsDropdown);

  if (UserReading.__timerTickListener) {
    document.removeEventListener("userreading:timer-tick", UserReading.__timerTickListener);
  }
  UserReading.__timerTickListener = updateQuestionProgress;
  document.addEventListener("userreading:timer-tick", UserReading.__timerTickListener);

  content.removeEventListener("input", UserReading.__updateQuestionProgress || function () {});
  content.removeEventListener("change", UserReading.__updateQuestionProgress || function () {});
  UserReading.__updateQuestionProgress = updateQuestionProgress;
  content.addEventListener("input", updateQuestionProgress);
  content.addEventListener("change", updateQuestionProgress);
  updateQuestionProgress();
};

UserReading.initMarkMode = function () {
  const content = document.getElementById("reading-user-content");
  const toggle = document.getElementById("reading-mark-toggle");

  if (!content || !toggle) return;

  UserReading.ensureMarkerStyles();

  UserReading.__markMode = false;
  UserReading.__markDragging = false;
  UserReading.__markStartRange = null;
  UserReading.__markEndRange = null;
  content.style.position = "relative";
  if (UserReading.__markPreview?.parentNode) {
    UserReading.__markPreview.parentNode.removeChild(UserReading.__markPreview);
  }
  UserReading.__markPreview = document.createElement("div");
  UserReading.__markPreview.style.position = "absolute";
  UserReading.__markPreview.style.pointerEvents = "none";
  UserReading.__markPreview.style.zIndex = "50";
  UserReading.__markPreview.style.top = "0";
  UserReading.__markPreview.style.left = "0";
  UserReading.__markPreview.style.right = "0";
  UserReading.__markPreview.style.bottom = "0";
  content.appendChild(UserReading.__markPreview);

  function getRangeFromPoint(x, y) {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;

      if (pos.offsetNode.nodeType !== 3) {
        const textNode = pos.offsetNode.childNodes[0];
        if (!textNode) return null;

        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
        return range;
      }

      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
      return range;
    }

    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }

    return null;
  }

  function expandToWord(range) {
    if (!range) return null;

    let node = range.startContainer;
    let offset = range.startOffset;

    if (node.nodeType !== 3) return range;

    const text = node.textContent || "";
    let start = offset;
    let end = offset;

    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }

    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }

    const newRange = document.createRange();
    newRange.setStart(node, start);
    newRange.setEnd(node, end);
    return newRange;
  }

  function getPoint(event) {
    if (event.touches && event.touches[0]) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }

    return {
      x: event.clientX,
      y: event.clientY
    };
  }

  function renderPreview(range) {
    const preview = UserReading.__markPreview;
    if (!preview) return;

    preview.innerHTML = "";

    if (!range || range.collapsed) return;

    const rects = range.getClientRects();
    const containerRect = content.getBoundingClientRect();

    for (const rect of rects) {
      const div = document.createElement("div");
      div.className = "mark-preview-rect";
      div.style.left = rect.left - containerRect.left + content.scrollLeft + "px";
      div.style.top = rect.top - containerRect.top + content.scrollTop + "px";
      div.style.width = rect.width + "px";
      div.style.height = rect.height + "px";
      preview.appendChild(div);
    }
  }

  function buildSafeRange(start, end) {
    if (!start || !end) return null;

    const range = document.createRange();

    try {
      const startNode = start.startContainer;
      const endNode = end.startContainer;

      const isForward =
        startNode === endNode
          ? start.startOffset <= end.startOffset
          : !!(startNode.compareDocumentPosition(endNode) & Node.DOCUMENT_POSITION_FOLLOWING);

      if (isForward) {
        range.setStart(startNode, start.startOffset);
        range.setEnd(endNode, end.startOffset);
      } else {
        range.setStart(endNode, end.startOffset);
        range.setEnd(startNode, start.startOffset);
      }
    } catch (error) {
      return null;
    }

    return range;
  }

  function setMarkMode(enabled) {
    UserReading.__markMode = enabled;
    content.classList.toggle("mark-mode", enabled);
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
    UserReading.__markStartRange = null;
    UserReading.__markEndRange = null;
    UserReading.__markDragging = false;
    if (UserReading.__markPreview) {
      UserReading.__markPreview.innerHTML = "";
    }
  }

  function startMark(event) {
    if (!UserReading.__markMode) return;

    UserReading.__markDragging = true;

    const point = getPoint(event);
    const rawRange = getRangeFromPoint(point.x, point.y);
    UserReading.__markStartRange = expandToWord(rawRange);
    UserReading.__markEndRange = UserReading.__markStartRange;

    event.preventDefault();
  }

  function moveMark(event) {
    if (!UserReading.__markMode || !UserReading.__markDragging || !UserReading.__markStartRange) return;

    const point = getPoint(event);
    const rawEnd = getRangeFromPoint(point.x, point.y);
    const endRange = expandToWord(rawEnd);
    if (!endRange) return;

    UserReading.__markEndRange = endRange;
    const range = buildSafeRange(
      UserReading.__markStartRange,
      endRange
    );
    if (!range) return;

    renderPreview(range);
    if (UserReading.__markDragging) {
      event.preventDefault();
    }
  }

  function endMark() {
    if (!UserReading.__markMode || !UserReading.__markStartRange || !UserReading.__markEndRange) {
      UserReading.__markDragging = false;
      return;
    }

    const range = buildSafeRange(
      UserReading.__markStartRange,
      UserReading.__markEndRange
    );
    if (!range) {
      UserReading.__markDragging = false;
      UserReading.__markStartRange = null;
      UserReading.__markEndRange = null;
      if (UserReading.__markPreview) {
        UserReading.__markPreview.innerHTML = "";
      }
      return;
    }

    if (UserReading.__markPreview) {
      UserReading.__markPreview.innerHTML = "";
    }
    UserReading.applyHighlight(range);

    UserReading.__markDragging = false;
    UserReading.__markStartRange = null;
    UserReading.__markEndRange = null;
  }

  if (UserReading.__markStartHandler) {
    content.removeEventListener("mousedown", UserReading.__markStartHandler);
    content.removeEventListener("touchstart", UserReading.__markStartHandler);
  }
  UserReading.__markStartHandler = startMark;
  content.addEventListener("mousedown", startMark);
  content.addEventListener("touchstart", startMark, { passive: false });

  if (UserReading.__markMoveHandler) {
    content.removeEventListener("mousemove", UserReading.__markMoveHandler);
    content.removeEventListener("touchmove", UserReading.__markMoveHandler);
  }
  UserReading.__markMoveHandler = moveMark;
  content.addEventListener("mousemove", moveMark);
  content.addEventListener("touchmove", moveMark, { passive: false });

  if (UserReading.__markEndHandler) {
    content.removeEventListener("mouseup", UserReading.__markEndHandler);
    content.removeEventListener("touchend", UserReading.__markEndHandler);
  }
  UserReading.__markEndHandler = endMark;
  content.addEventListener("mouseup", endMark);
  content.addEventListener("touchend", endMark);

  toggle.onclick = function () {
    const selection = window.getSelection();

    if (!UserReading.__markMode && selection && !selection.isCollapsed) {
      try {
        const range = selection.getRangeAt(0);
        UserReading.applyHighlight(range);
        selection.removeAllRanges();
        return;
      } catch (error) {}
    }

    setMarkMode(!UserReading.__markMode);
  };

  setMarkMode(false);
};

UserReading.ensureMarkerStyles = function () {
  if (document.getElementById("reading-mark-styles")) return;

  const style = document.createElement("style");
  style.id = "reading-mark-styles";
  style.textContent = `
    .highlight {
      background: rgba(255, 230, 0, 0.7);
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      padding: 0;
      border-radius: 2px;
    }

    .mark-mode,
    .mark-mode * {
      user-select: none;
      -webkit-user-select: none;
    }

    .reading-mark-toggle-active {
      background: #fff2a8 !important;
      color: #7c4a00 !important;
    }

    .mark-preview-rect {
      position: absolute;
      background: rgba(255, 230, 0, 0.35);
      border-radius: 2px;
    }
  `;

  document.head.appendChild(style);
};

UserReading.handleSubmitAttempt = function () {
  console.log("COLLECTED ANSWERS:", UserReading.collectAnswers());
  const questions = UserReading.__questionList || [];

  if (!questions.length) {
    UserReading.submitReading();
    return;
  }

  const unanswered = questions.filter((q) => {
    const controls = q.controls || [];

    if (!controls.length) return true;

    const hasChoice = controls.some((c) =>
      c.type === "radio" || c.type === "checkbox"
    );

    if (hasChoice) {
      return !controls.some((c) => c.checked);
    }

    return !controls.some((c) => String(c.value || "").trim().length > 0);
  });

  if (!unanswered.length) {
    UserReading.submitReading();
    return;
  }

  UserReading.showSubmitWarning(unanswered);
};
UserReading.showSubmitWarning = function (unanswered) {
  const existing = document.getElementById("reading-submit-warning");
  if (existing) existing.remove();

  const count = unanswered.length;
  const firstUnanswered = unanswered[0];

  const overlay = document.createElement("div");
  overlay.id = "reading-submit-warning";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0, 0, 0, 0.45)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";
  overlay.style.zIndex = "9999";

  overlay.innerHTML = `
    <div style="
      width: 100%;
      max-width: 340px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.22);
      padding: 18px 16px 14px 16px;
      box-sizing: border-box;
      text-align: left;
    ">
      <div style="
        font-size: 17px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 8px;
      ">
        Unanswered questions
      </div>

      <div style="
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
        margin-bottom: 14px;
      ">
        You still have <strong>${count}</strong> unanswered question${count > 1 ? "s" : ""}.
        You can go back and answer them, or submit anyway.
      </div>

      <div style="
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      ">
        <button
          type="button"
          id="reading-submit-back"
          style="
            border: 0;
            border-radius: 10px;
            background: #f3f4f6;
            color: #111827;
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          "
        >
          Back and answer
        </button>

        <button
          type="button"
          id="reading-submit-anyway"
          style="
            border: 0;
            border-radius: 10px;
            background: #111827;
            color: #ffffff;
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          "
        >
          Submit anyway
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backBtn = document.getElementById("reading-submit-back");
  const submitBtn = document.getElementById("reading-submit-anyway");

  backBtn.onclick = function () {
    overlay.remove();

    if (firstUnanswered?.anchor) {
      firstUnanswered.anchor.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  };

  submitBtn.onclick = function () {
    overlay.remove();
    UserReading.submitReading();
  };

  overlay.onclick = function (event) {
    if (event.target === overlay) {
      overlay.remove();
    }
  };
};

UserReading.submitReading = async function (options = {}) {
  const button = document.getElementById("reading-submit-btn");
  if (button?.disabled) return;
  if (UserReading.__isSubmitted) return;

  UserReading.setSubmitButtonLoading(true);

  try {
    if (UserReading.__mockId) {
      await UserReading.saveProgress(UserReading.__mockId);
      const result = await UserReading.submitProgress(UserReading.__mockId);
      const score = Number(result?.score || 0);
      const total = Number(result?.total || 0);

      UserReading.markSubmittedState(
        options.auto
          ? `Time is up. Auto-submitted: ${score}/${total}`
          : `Submitted: ${score}/${total}`
      );
      return;
    }

    UserReading.markSubmittedState("Submitted");
  } catch (error) {
    console.error("Submit failed:", error);
    alert("Failed to submit");
    UserReading.setSubmitButtonLoading(false);
    return;
  } finally {
    if (!UserReading.__isSubmitted) {
      UserReading.setSubmitButtonLoading(false);
    }
  }
};
