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

  function renderTarget(text, typed) {
    const chars = Array.from(String(text || ""));
    const typedChars = Array.isArray(typed) ? typed : Array.from(String(typed || ""));
    return chars.map((char, index) => {
      const typedChar = typedChars[index];
      const classes = ["shadow-char"];
      if (typedChar !== undefined) {
        classes.push(typedChar === char ? "sw-char--correct" : "sw-char--wrong");
      } else {
        classes.push("sw-char--pending");
        if (index === typedChars.length) classes.push("sw-char--current");
      }
      const cls = classes.join(" ");
      return `<span class="${cls}">${char === "\n" ? "<br>" : escapeHtml(char)}</span>`;
    }).join("");
  }

  function calculate(text, typed, startedAt) {
    const targetChars = Array.from(String(text || ""));
    const typedChars = (Array.isArray(typed) ? typed : Array.from(String(typed || ""))).slice(0, targetChars.length);
    let mistakes = 0;
    typedChars.forEach((char, index) => {
      if (char !== targetChars[index]) mistakes += 1;
    });
    const typedCount = typedChars.length;
    const correct = Math.max(0, typedCount - mistakes);
    const accuracy = typedCount > 0 ? Math.round((correct / typedCount) * 1000) / 10 : 0;
    const elapsed = Math.max(0, Math.round((Date.now() - Number(startedAt || Date.now())) / 1000));
    return {
      time_seconds: elapsed,
      accuracy,
      mistakes_count: mistakes,
      typed_chars: typedCount,
    };
  }

  ShadowWritingTyping.renderTarget = renderTarget;
  ShadowWritingTyping.calculate = calculate;
  ShadowWritingTyping.cleanup = ShadowWritingTyping.cleanup || function () {};

  ShadowWritingTyping.bind = function ({ essay, output, mobileInput, onComplete }) {
    if (!essay || !output) return;
    ShadowWritingTyping.cleanup();
    const targetText = String(essay.text || "");
    const targetChars = Array.from(targetText);
    const typedChars = [];
    let completed = false;

    function focusMobileInput() {
      if (!mobileInput || completed) return;
      mobileInput.focus({ preventScroll: true });
    }

    function rerender() {
      output.innerHTML = renderTarget(targetText, typedChars);
    }

    function completeIfReady() {
      if (completed || typedChars.length < targetChars.length) return;
      completed = true;
      if (mobileInput) mobileInput.disabled = true;
      ShadowWritingTyping.cleanup();
      onComplete?.(calculate(targetText, typedChars, ShadowWritingState.get().startedAt));
    }

    function addChar(char) {
      if (completed || typedChars.length >= targetChars.length) return;
      typedChars.push(char);
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
        addChar("\n");
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
    };

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
