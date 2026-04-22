  // frontend/js/admin_reading/core/instructions.js

window.ReadingInstructions = (function () {
  const STORAGE_KEY = "admin_reading_custom_instructions_v1";
  const ADD_OPTION_VALUE = "__ADD_CUSTOM_INSTRUCTION__";

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

  function normalizeType(type) {
    return String(type || "").toUpperCase();
  }

  function readCustom() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeCustom(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {}));
    } catch (_) {}
  }

  function uniqueNonEmpty(list) {
    const seen = new Set();
    const result = [];
    (list || []).forEach((item) => {
      const value = String(item || "").trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });
    return result;
  }

  function add(type, instruction) {
    const key = normalizeType(type);
    const value = String(instruction || "").trim();
    if (!key || !value) return false;

    const custom = readCustom();
    const current = Array.isArray(custom[key]) ? custom[key] : [];
    const next = uniqueNonEmpty([...current, value]);
    custom[key] = next;
    writeCustom(custom);
    return true;
  }

  /**
   * Get instructions list for a type
   */
  function get(type) {
    const key = normalizeType(type);
    const builtIn = DATA[key] || [];
    const custom = readCustom();
    const customList = Array.isArray(custom[key]) ? custom[key] : [];
    return uniqueNonEmpty([...builtIn, ...customList]);
  }

  /**
   * Fill a <select> element with instructions
   */
  function fillSelect(selectEl, type, selectedValue = "") {
    if (!selectEl) return;

    const key = normalizeType(type);
    const selected = String(selectedValue || "").trim();
    if (selected) add(key, selected);

    const list = get(key);
    selectEl.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select instruction";
    selectEl.appendChild(placeholder);

    let hasSelected = !selected;
    list.forEach((instr) => {
      const option = document.createElement("option");
      option.value = instr;
      option.textContent = instr;
      if (instr === selected) {
        option.selected = true;
        hasSelected = true;
      }
      selectEl.appendChild(option);
    });

    if (selected && !hasSelected) {
      const fallback = document.createElement("option");
      fallback.value = selected;
      fallback.textContent = selected;
      fallback.selected = true;
      selectEl.appendChild(fallback);
    }

    const addOption = document.createElement("option");
    addOption.value = ADD_OPTION_VALUE;
    addOption.textContent = "Add instruction...";
    selectEl.appendChild(addOption);
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
    add,
    fillSelect,
    ADD_OPTION_VALUE
  };

})();
