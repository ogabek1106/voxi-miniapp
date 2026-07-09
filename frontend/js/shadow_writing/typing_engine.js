window.ShadowWritingTyping = window.ShadowWritingTyping || {};

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeTargetText(value) {
    return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isWhitespace(char) {
    return /\s/.test(String(char || ""));
  }

  function paragraphBreakRunEnd(chars, index) {
    if (!isWhitespace(chars[index])) return index;
    let end = index;
    let hasLineBreak = false;
    while (end < chars.length && isWhitespace(chars[end])) {
      if (chars[end] === "\n" || chars[end] === "\r") hasLineBreak = true;
      end += 1;
    }
    return hasLineBreak ? end : index;
  }

  function paragraphBreakIndexSet(chars) {
    const skipped = new Set();
    let index = 0;
    while (index < chars.length) {
      const end = paragraphBreakRunEnd(chars, index);
      if (end > index) {
        for (let cursor = index; cursor < end; cursor += 1) skipped.add(cursor);
        index = end;
      } else {
        index += 1;
      }
    }
    return skipped;
  }

  function visibleTypedCount(typedLength, skippedIndexes) {
    let count = 0;
    for (let index = 0; index < typedLength; index += 1) {
      if (!skippedIndexes.has(index)) count += 1;
    }
    return count;
  }

  function renderTarget(text, typed, options = {}) {
    const chars = Array.from(normalizeTargetText(text));
    const typedChars = Array.isArray(typed) ? typed : Array.from(String(typed || ""));
    return chars.map((char, index) => {
      const typedChar = typedChars[index];
      const classes = ["shadow-char"];
      if (typedChar !== undefined) {
        classes.push(typedChar === char ? "sw-char--correct" : "sw-char--wrong");
      } else if (options.markRemainingWrong) {
        classes.push("sw-char--wrong");
      } else {
        classes.push("sw-char--pending");
        if (index === typedChars.length) classes.push("sw-char--current");
      }
      const cls = classes.join(" ");
      return `<span class="${cls}">${char === "\n" ? "<br>" : escapeHtml(char)}</span>`;
    }).join("");
  }

  function calculate(text, typed, startedAt, options = {}) {
    const targetChars = Array.from(normalizeTargetText(text));
    const typedChars = (Array.isArray(typed) ? typed : Array.from(String(typed || ""))).slice(0, targetChars.length);
    const skippedIndexes = paragraphBreakIndexSet(targetChars);
    let mistakes = 0;
    typedChars.forEach((char, index) => {
      if (skippedIndexes.has(index)) return;
      if (char !== targetChars[index]) mistakes += 1;
    });
    const totalChars = Math.max(0, targetChars.length - skippedIndexes.size);
    const typedCount = visibleTypedCount(typedChars.length, skippedIndexes);
    const wrongTypedCount = mistakes;
    const untypedCount = Math.max(0, totalChars - typedCount);
    const correct = Math.max(0, typedCount - wrongTypedCount);
    if (options.forceFinish) mistakes = wrongTypedCount + untypedCount;
    const denominator = options.forceFinish ? totalChars : typedCount;
    const accuracy = denominator > 0 ? Math.round((correct / denominator) * 1000) / 10 : 0;
    const elapsed = Math.max(0, Math.round((Date.now() - Number(startedAt || Date.now())) / 1000));
    const minutes = elapsed > 0 ? elapsed / 60 : 0;
    const wpm = minutes > 0 ? Math.round(((typedCount / 5) / minutes) * 10) / 10 : 0;
    return {
      time_seconds: elapsed,
      accuracy,
      mistakes_count: mistakes,
      typed_chars: typedCount,
      total_chars: totalChars,
      wpm,
    };
  }

  ShadowWritingTyping.renderTarget = renderTarget;
  ShadowWritingTyping.calculate = calculate;
  ShadowWritingTyping.cleanup = ShadowWritingTyping.cleanup || function () {};
  ShadowWritingTyping.finishNow = ShadowWritingTyping.finishNow || function () {};

  ShadowWritingTyping.bind = function ({ essay, output, mobileInput, onComplete }) {
    if (!essay || !output) return;
    ShadowWritingTyping.cleanup();
    const targetText = normalizeTargetText(essay.text);
    const targetChars = Array.from(targetText);
    const skippedIndexes = paragraphBreakIndexSet(targetChars);
    const visibleTotal = Math.max(0, targetChars.length - skippedIndexes.size);
    const typedChars = [];
    let completed = false;

    function focusMobileInput() {
      if (!mobileInput || completed) return;
      mobileInput.focus({ preventScroll: true });
    }

    function rerender() {
      output.innerHTML = renderTarget(targetText, typedChars);
      const total = visibleTotal || 1;
      const percent = Math.min(100, Math.round((visibleTypedCount(typedChars.length, skippedIndexes) / total) * 100));
      const fill = document.getElementById("shadow-writing-progress-fill");
      const label = document.getElementById("shadow-writing-progress-label");
      if (fill) fill.style.width = `${percent}%`;
      if (label) label.textContent = `${percent}%`;
    }

    function skipParagraphBreaks() {
      let changed = false;
      while (typedChars.length < targetChars.length) {
        const end = paragraphBreakRunEnd(targetChars, typedChars.length);
        if (end <= typedChars.length) break;
        while (typedChars.length < end) {
          typedChars.push(targetChars[typedChars.length]);
          changed = true;
        }
      }
      return changed;
    }

    function completeIfReady() {
      if (completed || typedChars.length < targetChars.length) return;
      completed = true;
      if (mobileInput) mobileInput.disabled = true;
      ShadowWritingTyping.cleanup();
      onComplete?.(calculate(targetText, typedChars, ShadowWritingState.get().startedAt));
    }

    function forceFinish() {
      if (completed) return;
      completed = true;
      if (mobileInput) mobileInput.disabled = true;
      skipParagraphBreaks();
      output.innerHTML = renderTarget(targetText, typedChars, { markRemainingWrong: true });
      const fill = document.getElementById("shadow-writing-progress-fill");
      const label = document.getElementById("shadow-writing-progress-label");
      if (fill) fill.style.width = "100%";
      if (label) label.textContent = "100%";
      const stats = calculate(targetText, typedChars, ShadowWritingState.get().startedAt, { forceFinish: true });
      ShadowWritingTyping.cleanup();
      window.setTimeout(() => onComplete?.(stats), 120);
    }

    function addChar(char) {
      if (completed || typedChars.length >= targetChars.length) return;
      skipParagraphBreaks();
      if (completed || typedChars.length >= targetChars.length) return;
      const normalizedChar = char === "\r" ? "\n" : char;
      if (normalizedChar === "\n") {
        skipParagraphBreaks();
        rerender();
        completeIfReady();
        return;
      }
      typedChars.push(normalizedChar);
      skipParagraphBreaks();
      rerender();
      completeIfReady();
    }

    function handleKeydown(event) {
      if (completed) return;

      const key = event.key || "";
      const lowerKey = key.toLowerCase();
      const blockedCombo = (event.ctrlKey || event.metaKey) && ["a", "v", "x", "z"].includes(lowerKey);
      const ignoredKeys = new Set([
        "Shift",
        "Alt",
        "Control",
        "Meta",
        "CapsLock",
        "Tab",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ]);

      if (key === "Backspace" || key === "Delete" || blockedCombo) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (ignoredKeys.has(key)) {
        if (key === "Tab") event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (key === "Enter") {
        event.preventDefault();
        skipParagraphBreaks();
        rerender();
        completeIfReady();
        return;
      }

      if (key === " ") {
        event.preventDefault();
        addChar(" ");
        return;
      }

      if (key.length === 1) {
        event.preventDefault();
        addChar(key);
      }
    }

    skipParagraphBreaks();
    rerender();
    output.tabIndex = 0;
    output.addEventListener("click", focusMobileInput);
    output.addEventListener("touchstart", focusMobileInput, { passive: true });
    document.addEventListener("keydown", handleKeydown);
    ShadowWritingTyping.cleanup = function () {
      document.removeEventListener("keydown", handleKeydown);
      output.removeEventListener("click", focusMobileInput);
      output.removeEventListener("touchstart", focusMobileInput);
      ShadowWritingTyping.cleanup = function () {};
      ShadowWritingTyping.finishNow = function () {};
    };
    ShadowWritingTyping.finishNow = forceFinish;

    if (mobileInput) {
      mobileInput.value = "";
      mobileInput.disabled = false;
      mobileInput.addEventListener("beforeinput", (event) => {
        if (event.inputType && event.inputType !== "insertText" && event.inputType !== "insertLineBreak") {
          event.preventDefault();
        }
      });
      mobileInput.addEventListener("paste", (event) => event.preventDefault());
      mobileInput.addEventListener("cut", (event) => event.preventDefault());
      mobileInput.addEventListener("input", () => {
        const value = mobileInput.value || "";
        if (!value) return;
        Array.from(value).forEach((char) => addChar(char));
        mobileInput.value = "";
      });
      mobileInput.addEventListener("keydown", (event) => {
        const lowerKey = String(event.key || "").toLowerCase();
        const blockedCombo = (event.ctrlKey || event.metaKey) && ["a", "v", "x", "z"].includes(lowerKey);
        if (event.key === "Backspace" || event.key === "Delete" || blockedCombo) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      window.setTimeout(focusMobileInput, 80);
    }
  };
})();
