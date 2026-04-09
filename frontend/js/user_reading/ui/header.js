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
          bottom: 68px;
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
          bottom: 68px;
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

UserReading.goBack = function () {
  if (typeof window.showMocksScreen === "function") {
    window.showMocksScreen();
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

UserReading.initHeader = function (data) {
  UserReading.initReadingTimer(data?.timer);
  UserReading.initPassageCounter();
  UserReading.initQuestionCounter();
  UserReading.initMarkMode();
};

UserReading.initReadingTimer = function (timer) {
  const text = document.getElementById("timer-text");
  const fill = document.getElementById("timer-fill");
  if (!text || !fill) return;

  if (window.__userReadingTimer) {
    clearInterval(window.__userReadingTimer);
  }

  const fallbackDuration = 60 * 60;
  const endsAt = timer?.ends_at ? new Date(timer.ends_at).getTime() : Date.now() + fallbackDuration * 1000;
  const duration = Number(timer?.duration_seconds || timer?.total_seconds || fallbackDuration);

  function tick() {
    const leftSec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const minutes = String(Math.floor(leftSec / 60)).padStart(2, "0");
    const seconds = String(leftSec % 60).padStart(2, "0");
    const percent = duration > 0 ? Math.max(0, Math.min(100, (leftSec / duration) * 100)) : 0;

    text.textContent = `${minutes}:${seconds}`;
    fill.style.width = `${percent}%`;

    if (leftSec <= 0) {
      clearInterval(window.__userReadingTimer);
      window.__userReadingTimer = null;
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
  const passages = Array.from(document.querySelectorAll(".reading-passage"));

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

  button.onclick = function (event) {
    event.stopPropagation();
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
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
  const text = document.getElementById("questions-text");
  const fill = document.getElementById("questions-fill");
  const content = document.getElementById("reading-user-content");
  if (!text || !fill || !content) return;

  function hasAnswer(question) {
    const fields = Array.from(question.querySelectorAll("input, select, textarea"));

    return fields.some((field) => {
      if (field.type === "radio" || field.type === "checkbox") return field.checked;
      return String(field.value || "").trim().length > 0;
    });
  }

  function updateQuestionProgress() {
    const questions = Array.from(document.querySelectorAll(".reading-question[data-question-id]"));
    const total = questions.length;
    const solved = questions.filter(hasAnswer).length;
    const percent = total ? (solved / total) * 100 : 0;
    const green = Math.round((solved / Math.max(total, 1)) * 150);

    text.textContent = `${solved}/${total}`;
    fill.style.width = `${percent}%`;
    fill.style.background = `rgb(${239 - green}, ${68 + green}, 68)`;
  }

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

  function getRangeFromPoint(x, y) {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;

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

  function applyHighlight(range) {
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
  }

  function setMarkMode(enabled) {
    UserReading.__markMode = enabled;
    content.classList.toggle("mark-mode", enabled);
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
    UserReading.__markStartRange = null;
    UserReading.__markEndRange = null;
    UserReading.__markDragging = false;
  }

  function startMark(event) {
    if (!UserReading.__markMode) return;

    UserReading.__markDragging = true;

    const point = getPoint(event);
    UserReading.__markStartRange = getRangeFromPoint(point.x, point.y);
    UserReading.__markEndRange = UserReading.__markStartRange;

    event.preventDefault();
  }

  function moveMark(event) {
    if (!UserReading.__markMode || !UserReading.__markDragging || !UserReading.__markStartRange) return;

    const point = getPoint(event);
    const endRange = getRangeFromPoint(point.x, point.y);
    if (!endRange) return;

    UserReading.__markEndRange = endRange;
    event.preventDefault();
  }

  function endMark() {
    if (!UserReading.__markMode || !UserReading.__markStartRange || !UserReading.__markEndRange) {
      UserReading.__markDragging = false;
      return;
    }

    const range = document.createRange();

    try {
      range.setStart(
        UserReading.__markStartRange.startContainer,
        UserReading.__markStartRange.startOffset
      );

      range.setEnd(
        UserReading.__markEndRange.startContainer,
        UserReading.__markEndRange.startOffset
      );
    } catch (error) {
      try {
        range.setStart(
          UserReading.__markEndRange.startContainer,
          UserReading.__markEndRange.startOffset
        );

        range.setEnd(
          UserReading.__markStartRange.startContainer,
          UserReading.__markStartRange.startOffset
        );
      } catch (innerError) {
        UserReading.__markDragging = false;
        UserReading.__markStartRange = null;
        UserReading.__markEndRange = null;
        return;
      }
    }

    applyHighlight(range);

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
      background:
        linear-gradient(
          180deg,
          transparent 40%,
          rgba(255, 230, 0, 0.7) 40%
        );
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      border-radius: 0.2em;
      padding: 0 0.02em;
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
  `;

  document.head.appendChild(style);
};
