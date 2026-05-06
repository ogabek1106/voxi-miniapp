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
      let cls = "shadow-char";
      if (index === typedChars.length) cls += " is-current";
      if (typedChar !== undefined) cls += typedChar === char ? " is-correct" : " is-wrong";
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

    function backspace() {
      if (completed || typedChars.length <= 0) return;
      typedChars.pop();
      rerender();
    }

    function handleKeydown(event) {
      if (completed) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        addChar("\n");
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        addChar(" ");
        return;
      }

      if (event.key && event.key.length === 1) {
        event.preventDefault();
        addChar(event.key);
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
      mobileInput.addEventListener("input", () => {
        const value = mobileInput.value || "";
        if (!value) return;
        Array.from(value).forEach((char) => addChar(char));
        mobileInput.value = "";
      });
      mobileInput.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          backspace();
        }
      });
      window.setTimeout(focusMobileInput, 80);
    }
  };
})();
