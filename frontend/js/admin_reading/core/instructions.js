  // frontend/js/admin_reading/core/instructions.js

window.ReadingInstructions = (function () {

  const DATA = {
    MATCHING: [
      "Choose the correct letter, A–D, for each question.",
      "Match each statement with the correct option."
    ],

    PARAGRAPH_MATCHING: [
      "Which paragraph contains the following information?\nWrite the correct letter, A–G, for each question.",
      "Which paragraph contains the following information?"
    ],

    SINGLE_CHOICE: [
      "Choose the correct answer, A, B, C or D."
    ],

    MULTI_CHOICE: [
      "Choose TWO letters, A–E.",
      "Choose THREE letters, A–F."
    ],

    TFNG: [
      "Do the following statements agree with the information in the passage?\nWrite TRUE, FALSE or NOT GIVEN."
    ],

    YES_NO_NG: [
      "Do the following statements agree with the views of the writer?\nWrite YES, NO or NOT GIVEN."
    ],

    TEXT_INPUT: [
      "Write ONE WORD ONLY.",
      "Write NO MORE THAN TWO WORDS.",
      "Write NO MORE THAN THREE WORDS AND/OR A NUMBER."
    ],

    IMAGE_QUESTIONS: [
      "Label the image. Write ONE WORD ONLY for each answer.",
      "Complete each label with NO MORE THAN TWO WORDS."
    ]
  };

  /**
   * Get instructions list for a type
   */
  function get(type) {
    const key = String(type || "").toUpperCase();
    return DATA[key] || [];
  }

  /**
   * Fill a <select> element with instructions
   */
  function fillSelect(selectEl, type, selectedValue = "") {
    if (!selectEl) return;

    const list = get(type);

    selectEl.innerHTML = `
      <option value="">Select instruction</option>
      ${list.map(instr => `
        <option value="${escapeHtml(instr)}"
          ${instr === selectedValue ? "selected" : ""}>
          ${instr}
        </option>
      `).join("")}
    `;
  }

  /**
   * Simple escape (safe for HTML injection)
   */
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    get,
    fillSelect
  };

})();
