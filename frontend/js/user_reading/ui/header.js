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

      <div id="reading-mark-toolbar" style="
        display: none;
        position: fixed;
        left: 0;
        top: 0;
        z-index: 300;
        gap: 6px;
        padding: 6px;
        border-radius: 999px;
        background: rgba(17,17,17,0.92);
        box-shadow: 0 10px 26px rgba(0,0,0,0.2);
      ">
        <button type="button" id="reading-mark-btn" style="
          border: 0;
          border-radius: 999px;
          padding: 6px 10px;
          background: #fff3a3;
          color: #111;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        ">Mark</button>
        <button type="button" id="reading-unmark-btn" style="
          border: 0;
          border-radius: 999px;
          padding: 6px 10px;
          background: #fff;
          color: #111;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        ">Unmark</button>
      </div>
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
  UserReading.initTextMarker();
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

UserReading.initTextMarker = function () {
  const content = document.getElementById("reading-user-content");
  const toolbar = document.getElementById("reading-mark-toolbar");
  const markButton = document.getElementById("reading-mark-btn");
  const unmarkButton = document.getElementById("reading-unmark-btn");

  if (!content || !toolbar || !markButton || !unmarkButton) return;

  UserReading.ensureMarkerStyles();

  content.style.userSelect = "text";
  content.style.webkitUserSelect = "text";
  content.style.webkitTouchCallout = "none";

  function hideToolbar() {
    toolbar.style.display = "none";
  }

  function getSelectionRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    if (!ancestor || !content.contains(ancestor)) return null;
    return range;
  }

  function positionToolbar(range) {
    const rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      hideToolbar();
      return;
    }

    const width = toolbar.offsetWidth || 140;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width / 2) - (width / 2)));
    const top = Math.max(8, rect.top - 52);

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
    toolbar.style.display = "flex";
  }

  function updateToolbar() {
    const range = getSelectionRange();
    if (!range) {
      hideToolbar();
      return;
    }

    positionToolbar(range);
  }

  function clearSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
    hideToolbar();
  }

  function splitTextNode(node, startOffset, endOffset) {
    let target = node;
    let localEnd = endOffset;

    if (startOffset > 0) {
      target = target.splitText(startOffset);
      localEnd -= startOffset;
    }

    if (localEnd < target.nodeValue.length) {
      target.splitText(localEnd);
    }

    return target;
  }

  function rangeIntersectsTextNode(range, textNode) {
    const probe = document.createRange();
    probe.selectNodeContents(textNode);

    return (
      range.compareBoundaryPoints(Range.END_TO_START, probe) > 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, probe) < 0
    );
  }

  function getTextNodesInRange(range, highlightedOnly) {
    const root = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!content.contains(node.parentNode)) return NodeFilter.FILTER_REJECT;
        if (!rangeIntersectsTextNode(range, node)) return NodeFilter.FILTER_REJECT;

        const inMark = !!node.parentNode.closest(".reading-mark");
        if (highlightedOnly && !inMark) return NodeFilter.FILTER_REJECT;
        if (!highlightedOnly && inMark) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }
    return nodes;
  }

  function getOffsetsForNode(range, node) {
    const startOffset = node === range.startContainer ? range.startOffset : 0;
    const endOffset = node === range.endContainer ? range.endOffset : node.nodeValue.length;
    return { startOffset, endOffset };
  }

  function markSelection() {
    const range = getSelectionRange();
    if (!range) return;

    const nodes = getTextNodesInRange(range, false);
    nodes.forEach((node) => {
      const { startOffset, endOffset } = getOffsetsForNode(range, node);
      if (startOffset === endOffset) return;

      const target = splitTextNode(node, startOffset, endOffset);
      const mark = document.createElement("span");
      mark.className = "reading-mark";
      mark.setAttribute("data-reading-mark", "1");
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
    });

    clearSelection();
  }

  function unmarkSelection() {
    const range = getSelectionRange();
    if (!range) return;

    const nodes = getTextNodesInRange(range, true);
    nodes.forEach((node) => {
      const { startOffset, endOffset } = getOffsetsForNode(range, node);
      if (startOffset === endOffset) return;

      const target = splitTextNode(node, startOffset, endOffset);
      const mark = target.parentNode.closest(".reading-mark");
      if (!mark) return;

      const parent = mark.parentNode;
      const beforeWrapper = document.createElement("span");
      const afterWrapper = document.createElement("span");
      beforeWrapper.className = "reading-mark";
      beforeWrapper.setAttribute("data-reading-mark", "1");
      afterWrapper.className = "reading-mark";
      afterWrapper.setAttribute("data-reading-mark", "1");

      while (mark.firstChild && mark.firstChild !== target) {
        beforeWrapper.appendChild(mark.firstChild);
      }

      while (target.nextSibling) {
        afterWrapper.appendChild(target.nextSibling);
      }

      if (beforeWrapper.childNodes.length) {
        parent.insertBefore(beforeWrapper, mark);
      }

      parent.insertBefore(target, mark);

      if (afterWrapper.childNodes.length) {
        parent.insertBefore(afterWrapper, mark.nextSibling);
      }

      mark.remove();
    });

    Array.from(content.querySelectorAll(".reading-mark")).forEach((mark) => {
      if (!mark.textContent) mark.remove();
    });

    clearSelection();
  }

  if (UserReading.__markerSelectionHandler) {
    document.removeEventListener("selectionchange", UserReading.__markerSelectionHandler);
  }
  UserReading.__markerSelectionHandler = updateToolbar;
  document.addEventListener("selectionchange", updateToolbar);

  if (UserReading.__markerMouseUpHandler) {
    content.removeEventListener("mouseup", UserReading.__markerMouseUpHandler);
    content.removeEventListener("touchend", UserReading.__markerMouseUpHandler);
  }
  UserReading.__markerMouseUpHandler = function () {
    setTimeout(updateToolbar, 10);
  };
  content.addEventListener("mouseup", UserReading.__markerMouseUpHandler);
  content.addEventListener("touchend", UserReading.__markerMouseUpHandler, { passive: true });

  if (UserReading.__markerInputBlocker) {
    content.removeEventListener("copy", UserReading.__markerInputBlocker);
    content.removeEventListener("cut", UserReading.__markerInputBlocker);
    content.removeEventListener("paste", UserReading.__markerInputBlocker);
    content.removeEventListener("contextmenu", UserReading.__markerInputBlocker);
  }
  UserReading.__markerInputBlocker = function (event) {
    event.preventDefault();
  };
  content.addEventListener("copy", UserReading.__markerInputBlocker);
  content.addEventListener("cut", UserReading.__markerInputBlocker);
  content.addEventListener("paste", UserReading.__markerInputBlocker);
  content.addEventListener("contextmenu", UserReading.__markerInputBlocker);

  [toolbar, markButton, unmarkButton].forEach((element) => {
    element.onpointerdown = function (event) {
      event.preventDefault();
    };
  });

  markButton.onclick = function (event) {
    event.preventDefault();
    markSelection();
  };

  unmarkButton.onclick = function (event) {
    event.preventDefault();
    unmarkSelection();
  };

  if (UserReading.__markerScrollHandler) {
    window.removeEventListener("scroll", UserReading.__markerScrollHandler);
  }
  UserReading.__markerScrollHandler = hideToolbar;
  window.addEventListener("scroll", UserReading.__markerScrollHandler, { passive: true });
};

UserReading.ensureMarkerStyles = function () {
  if (document.getElementById("reading-mark-styles")) return;

  const style = document.createElement("style");
  style.id = "reading-mark-styles";
  style.textContent = `
    .reading-mark {
      background:
        linear-gradient(
          180deg,
          transparent 0%,
          transparent 14%,
          rgba(255, 248, 184, 0.35) 14%,
          rgba(255, 244, 153, 0.82) 24%,
          rgba(255, 239, 122, 0.92) 45%,
          rgba(255, 242, 140, 0.86) 76%,
          rgba(255, 248, 184, 0.4) 88%,
          transparent 100%
        );
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      border-radius: 0.2em;
      padding: 0 0.02em;
    }
  `;

  document.head.appendChild(style);
};
