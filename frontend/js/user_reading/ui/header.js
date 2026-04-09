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
  UserReading.__markStartRange = null;
  UserReading.__markEndRange = null;
  UserReading.__markDragging = false;
  UserReading.__markPressTimer = null;
  UserReading.__markPressPoint = null;

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

  function markRange(range) {
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
  }

  function unmarkRange(range) {
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
  }

  function mergeAdjacentHighlights(root) {
    Array.from(root.querySelectorAll(".reading-mark")).forEach((mark) => {
      let next = mark.nextSibling;
      while (next && next.nodeType === 1 && next.classList.contains("reading-mark")) {
        while (next.firstChild) {
          mark.appendChild(next.firstChild);
        }
        const oldNext = next;
        next = next.nextSibling;
        oldNext.remove();
      }

      mark.normalize();
    });
  }

  function getRangeFromPoint(x, y) {
    function normalizeRange(range) {
      if (!range) return null;

      let node = range.startContainer;
      let offset = range.startOffset;

      if (node.nodeType === 1) {
        const child = node.childNodes[offset] || node.childNodes[offset - 1];
        if (!child) return null;

        if (child.nodeType === 3) {
          node = child;
          offset = 0;
        } else {
          const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
          const textNode = walker.nextNode();
          if (!textNode) return null;
          node = textNode;
          offset = 0;
        }
      }

      if (node.nodeType !== 3) return null;

      const collapsed = document.createRange();
      collapsed.setStart(node, Math.min(offset, node.nodeValue.length));
      collapsed.setEnd(node, Math.min(offset, node.nodeValue.length));
      return collapsed;
    }

    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;

      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
      return normalizeRange(range);
    }

    if (document.caretRangeFromPoint) {
      return normalizeRange(document.caretRangeFromPoint(x, y));
    }

    return null;
  }

  function compareCollapsedRanges(a, b) {
    const probeA = document.createRange();
    const probeB = document.createRange();
    probeA.setStart(a.startContainer, a.startOffset);
    probeA.setEnd(a.startContainer, a.startOffset);
    probeB.setStart(b.startContainer, b.startOffset);
    probeB.setEnd(b.startContainer, b.startOffset);
    return probeA.compareBoundaryPoints(Range.START_TO_START, probeB);
  }

  function normalizeDragRange(startRange, endRange) {
    if (!startRange || !endRange) return null;

    const range = document.createRange();
    const order = compareCollapsedRanges(startRange, endRange);
    const first = order <= 0 ? startRange : endRange;
    const second = order <= 0 ? endRange : startRange;

    range.setStart(first.startContainer, first.startOffset);
    range.setEnd(second.startContainer, second.startOffset);
    return range.collapsed ? null : range;
  }

  function expandRangeToWord(range) {
    if (!range) return null;
    const node = range.startContainer;
    if (!node || node.nodeType !== 3) return null;

    const text = node.nodeValue || "";
    if (!text.trim()) return null;

    let start = Math.min(range.startOffset, text.length);
    let end = Math.min(range.startOffset, text.length);
    const isWordChar = (char) => /[A-Za-z0-9'-]/.test(char || "");

    while (start > 0 && isWordChar(text[start - 1])) start -= 1;
    while (end < text.length && isWordChar(text[end])) end += 1;
    if (start === end) return null;

    const wordRange = document.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);
    return wordRange;
  }

  function applyHighlight(range) {
    markRange(range);
    mergeAdjacentHighlights(content);
  }

  function getClientPoint(event) {
    if (event.touches && event.touches[0]) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    if (event.changedTouches && event.changedTouches[0]) {
      return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }

    return { x: event.clientX, y: event.clientY };
  }

  function setMarkMode(enabled) {
    UserReading.__markMode = enabled;
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
    UserReading.__markStartRange = null;
    UserReading.__markEndRange = null;
    UserReading.__markDragging = false;
    UserReading.__markPressPoint = null;

    if (UserReading.__markPressTimer) {
      clearTimeout(UserReading.__markPressTimer);
      UserReading.__markPressTimer = null;
    }
  }

  function beginMarking(point) {
    const range = getRangeFromPoint(point.x, point.y);
    if (!range || !content.contains(range.startContainer)) return;

    UserReading.__markStartRange = range;
    UserReading.__markEndRange = range;
    UserReading.__markDragging = true;
  }

  function startDrag(event) {
    if (!UserReading.__markMode) return;
    if (event.target && event.target.closest && event.target.closest("input, textarea, select, button, label")) return;

    const point = getClientPoint(event);
    UserReading.__markPressPoint = point;

    if (UserReading.__markPressTimer) {
      clearTimeout(UserReading.__markPressTimer);
    }

    UserReading.__markPressTimer = setTimeout(() => {
      UserReading.__markPressTimer = null;
      beginMarking(point);
    }, 260);
  }

  function moveDrag(event) {
    const point = getClientPoint(event);

    if (UserReading.__markMode && UserReading.__markPressTimer && UserReading.__markPressPoint) {
      const dx = Math.abs(point.x - UserReading.__markPressPoint.x);
      const dy = Math.abs(point.y - UserReading.__markPressPoint.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(UserReading.__markPressTimer);
        UserReading.__markPressTimer = null;
        beginMarking(UserReading.__markPressPoint);
      }
    }

    if (!UserReading.__markMode || !UserReading.__markDragging) return;

    const range = getRangeFromPoint(point.x, point.y);
    if (!range || !content.contains(range.startContainer)) return;

    UserReading.__markEndRange = range;
    event.preventDefault();
    event.stopPropagation();
  }

  function endDrag(event) {
    if (!UserReading.__markMode) return;

    if (UserReading.__markPressTimer && UserReading.__markPressPoint) {
      clearTimeout(UserReading.__markPressTimer);
      UserReading.__markPressTimer = null;
      beginMarking(UserReading.__markPressPoint);
    }

    if (!UserReading.__markDragging) return;

    const point = getClientPoint(event);
    const rangeAtEnd = getRangeFromPoint(point.x, point.y);
    if (rangeAtEnd && content.contains(rangeAtEnd.startContainer)) {
      UserReading.__markEndRange = rangeAtEnd;
    }

    const range =
      normalizeDragRange(UserReading.__markStartRange, UserReading.__markEndRange) ||
      expandRangeToWord(UserReading.__markEndRange || UserReading.__markStartRange);
    UserReading.__markDragging = false;
    UserReading.__markStartRange = null;
    UserReading.__markEndRange = null;
    UserReading.__markPressPoint = null;

    if (!range) return;

    applyHighlight(range);

    event.preventDefault();
    event.stopPropagation();
  }

  if (UserReading.__markStartHandler) {
    content.removeEventListener("mousedown", UserReading.__markStartHandler, true);
    content.removeEventListener("touchstart", UserReading.__markStartHandler, true);
  }
  UserReading.__markStartHandler = startDrag;
  content.addEventListener("mousedown", startDrag, true);
  content.addEventListener("touchstart", startDrag, { passive: false, capture: true });

  if (UserReading.__markMoveHandler) {
    document.removeEventListener("mousemove", UserReading.__markMoveHandler, true);
    document.removeEventListener("touchmove", UserReading.__markMoveHandler, true);
  }
  UserReading.__markMoveHandler = moveDrag;
  document.addEventListener("mousemove", moveDrag, true);
  document.addEventListener("touchmove", moveDrag, { passive: false, capture: true });

  if (UserReading.__markEndHandler) {
    document.removeEventListener("mouseup", UserReading.__markEndHandler, true);
    document.removeEventListener("touchend", UserReading.__markEndHandler, true);
    document.removeEventListener("touchcancel", UserReading.__markEndHandler, true);
  }
  UserReading.__markEndHandler = endDrag;
  document.addEventListener("mouseup", endDrag, true);
  document.addEventListener("touchend", endDrag, { passive: false, capture: true });
  document.addEventListener("touchcancel", endDrag, { passive: false, capture: true });

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
    .reading-mark {
      background:
        linear-gradient(
          180deg,
          transparent 0%,
          transparent 34%,
          rgba(255, 241, 128, 0.18) 34%,
          rgba(255, 236, 94, 0.72) 44%,
          rgba(255, 232, 78, 0.82) 64%,
          rgba(255, 240, 122, 0.66) 84%,
          transparent 100%
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
