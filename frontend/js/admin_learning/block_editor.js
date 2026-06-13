window.AdminLearningBlockEditor = window.AdminLearningBlockEditor || {};

(function () {
  const blockTypes = ["intro", "explanation", "multiple_choice", "word_shuffle", "match_words", "completion"];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function lines(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function pairs(value) {
    return Array.isArray(value)
      ? value.map((pair) => `${pair?.left || ""} = ${pair?.right || ""}`).join("\n")
      : "";
  }

  function fields(type, content) {
    if (type === "explanation") {
      return `
        <label>Title <input data-block-field="title" value="${escapeHtml(content.title || "")}"></label>
        <label>Text <textarea data-block-field="text">${escapeHtml(content.text || "")}</textarea></label>
        <label>Examples <textarea data-block-field="examples" data-block-array="lines">${escapeHtml(lines(content.examples))}</textarea></label>
      `;
    }
    if (type === "multiple_choice") {
      return `
        <label>Question <textarea data-block-field="question">${escapeHtml(content.question || "")}</textarea></label>
        <label>Options <textarea data-block-field="options" data-block-array="lines">${escapeHtml(lines(content.options))}</textarea></label>
        <label>Correct index <input data-block-field="correct_index" type="number" value="${content.correct_index ?? ""}"></label>
        <label>Explanation <textarea data-block-field="explanation">${escapeHtml(content.explanation || "")}</textarea></label>
      `;
    }
    if (type === "word_shuffle") {
      return `
        <label>Prompt <textarea data-block-field="prompt">${escapeHtml(content.prompt || "")}</textarea></label>
        <label>Words <textarea data-block-field="words" data-block-array="lines">${escapeHtml(lines(content.words))}</textarea></label>
        <label>Correct sentence <input data-block-field="correct_sentence" value="${escapeHtml(content.correct_sentence || "")}"></label>
      `;
    }
    if (type === "match_words") {
      return `<label>Pairs <textarea data-block-field="pairs" data-block-array="pairs" placeholder="left = right">${escapeHtml(pairs(content.pairs))}</textarea></label>`;
    }
    if (type === "completion") {
      return `
        <label>Title <input data-block-field="title" value="${escapeHtml(content.title || "")}"></label>
        <label>Message <textarea data-block-field="message">${escapeHtml(content.message || "")}</textarea></label>
        <label>XP reward <input data-block-field="xp_reward" type="number" value="${content.xp_reward ?? ""}"></label>
      `;
    }
    return `
      <label>Title <input data-block-field="title" value="${escapeHtml(content.title || "")}"></label>
      <label>Text <textarea data-block-field="text">${escapeHtml(content.text || "")}</textarea></label>
      <label>Button text <input data-block-field="button_text" value="${escapeHtml(content.button_text || "")}"></label>
    `;
  }

  function typeOptions(selected) {
    return blockTypes.map((type) => (
      `<option value="${type}" ${type === selected ? "selected" : ""}>${type}</option>`
    )).join("");
  }

  AdminLearningBlockEditor.render = function (block = null) {
    const type = block?.block_type || "intro";
    const content = block?.content_json || {};
    return `
      <form class="admin-learning-card admin-learning-block-form" id="admin-learning-block-form">
        <input id="learning-block-id" type="hidden" value="${escapeHtml(block?.id || "")}">
        <div class="admin-learning-form-grid">
          <label>Block type
            <select id="learning-block-type">${typeOptions(type)}</select>
          </label>
          <label>Sort order
            <input id="learning-block-sort" type="number" value="${Number(block?.sort_order || 0)}">
          </label>
        </div>
        <label class="admin-learning-check">Required
          <input id="learning-block-required" type="checkbox" ${block?.is_required ? "checked" : ""}>
        </label>
        <div id="learning-block-fields">${fields(type, content)}</div>
        <button type="submit">${block?.id ? "Save block" : "Add block"}</button>
        ${block?.id ? `<button type="button" data-cancel-block-edit>Cancel edit</button>` : ""}
      </form>
    `;
  };

  AdminLearningBlockEditor.renderFieldsForSelectedType = function () {
    const host = document.getElementById("learning-block-fields");
    const type = document.getElementById("learning-block-type")?.value || "intro";
    if (host) host.innerHTML = fields(type, {});
  };

  AdminLearningBlockEditor.collect = function () {
    const content = {};
    document.querySelectorAll("[data-block-field]").forEach((field) => {
      const key = field.dataset.blockField;
      if (field.dataset.blockArray === "lines") {
        content[key] = String(field.value || "").split("\n").map((item) => item.trim()).filter(Boolean);
      } else if (field.dataset.blockArray === "pairs") {
        content[key] = String(field.value || "").split("\n").map((line) => {
          const parts = line.split("=");
          return { left: (parts[0] || "").trim(), right: parts.slice(1).join("=").trim() };
        }).filter((pair) => pair.left || pair.right);
      } else if (field.type === "number") {
        content[key] = field.value === "" ? null : Number(field.value);
      } else {
        content[key] = field.value?.trim() || "";
      }
    });
    const sortValue = document.getElementById("learning-block-sort")?.value;
    return {
      id: document.getElementById("learning-block-id")?.value || null,
      block_type: document.getElementById("learning-block-type")?.value || null,
      sort_order: sortValue === "" ? null : Number(sortValue),
      content_json: content,
      is_required: Boolean(document.getElementById("learning-block-required")?.checked),
    };
  };

  AdminLearningBlockEditor.find = function (blocks, id) {
    return (blocks || []).find((block) => Number(block.id) === Number(id));
  };
})();
