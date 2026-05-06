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
    const typedChars = Array.from(String(typed || ""));
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
    const typedChars = Array.from(String(typed || "")).slice(0, targetChars.length);
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

  ShadowWritingTyping.bind = function ({ essay, output, input, onComplete }) {
    if (!essay || !output || !input) return;
    const targetText = String(essay.text || "");
    output.innerHTML = renderTarget(targetText, "");
    input.value = "";
    input.focus();

    input.addEventListener("input", () => {
      if (input.value.length > targetText.length) {
        input.value = input.value.slice(0, targetText.length);
      }
      output.innerHTML = renderTarget(targetText, input.value);

      if (input.value.length >= targetText.length) {
        input.disabled = true;
        onComplete?.(calculate(targetText, input.value, ShadowWritingState.get().startedAt));
      }
    });
  };
})();
