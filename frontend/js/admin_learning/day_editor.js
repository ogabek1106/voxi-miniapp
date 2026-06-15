window.AdminLearningDayEditor = window.AdminLearningDayEditor || {};

(function () {
  const defaultSections = ["intro", "explanation", "vocabulary", "completion"];
  const gameTypes = ["multiple_choice", "word_shuffle", "match_words", "odd_one_out", "fill_gap"];

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

  function findFirstBlock(blocks, type) {
    return (blocks || [])
      .filter((block) => block.block_type === type)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0))[0] || null;
  }

  function gameBlocks(blocks) {
    return (blocks || [])
      .filter((block) => gameTypes.includes(block.block_type))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0));
  }

  function otherBlocks(blocks) {
    return (blocks || [])
      .filter((block) => !defaultSections.includes(block.block_type) && !gameTypes.includes(block.block_type))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0));
  }

  function helper(text) {
    return `<small class="admin-learning-helper">${escapeHtml(text)}</small>`;
  }

  function field(label, id, value, helpText = "", attrs = "") {
    return `
      <label>${escapeHtml(label)}
        <input id="${id}" value="${escapeHtml(value || "")}" ${attrs}>
        ${helpText ? helper(helpText) : ""}
      </label>
    `;
  }

  function textarea(label, id, value, helpText = "", attrs = "") {
    return `
      <label>${escapeHtml(label)}
        <textarea id="${id}" ${attrs}>${escapeHtml(value || "")}</textarea>
        ${helpText ? helper(helpText) : ""}
      </label>
    `;
  }

  function selectOptions(options, selected) {
    return options.map((option) => (
      `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`
    )).join("");
  }

  function gameFields(block, index) {
    const content = block.content_json || {};
    const type = block.block_type || "multiple_choice";
    const prefix = `learning-game-${index}`;
    const body = AdminLearningDayEditor.renderGameFields(type, index, content);

    return `
      <article class="admin-learning-game-card" data-game-index="${index}" data-game-id="${escapeHtml(block.id || "")}">
        <div class="admin-learning-game-head">
          <label>Game type
            <select id="${prefix}-type" data-game-type-select="${index}">
              ${selectOptions(gameTypes, type)}
            </select>
          </label>
          <div class="admin-learning-game-actions">
            <button type="button" data-move-block="${Number(block.id || 0)}" data-direction="up" ${block.id ? "" : "disabled"}>Up</button>
            <button type="button" data-move-block="${Number(block.id || 0)}" data-direction="down" ${block.id ? "" : "disabled"}>Down</button>
            <button type="button" data-delete-block="${Number(block.id || 0)}" ${block.id ? "" : "disabled"}>Delete</button>
          </div>
        </div>
        <div class="admin-learning-game-fields">${body}</div>
      </article>
    `;
  }

  AdminLearningDayEditor.renderGameFields = function (type, index, content = {}) {
    const prefix = `learning-game-${index}`;
    if (type === "word_shuffle") {
      return `
        ${textarea("Prompt", `${prefix}-prompt`, content.prompt || "", "Example: Put the words in the correct order.")}
        ${textarea("Words", `${prefix}-words`, lines(content.words), "One word per line.")}
        ${field("Correct sentence", `${prefix}-correct-sentence`, content.correct_sentence || "")}
      `;
    }
    if (type === "match_words") {
      return textarea("Pairs", `${prefix}-pairs`, pairs(content.pairs), "Use one pair per line: word = translation.");
    }
    if (type === "odd_one_out") {
      return `
        ${textarea("Prompt", `${prefix}-prompt`, content.prompt || "", "Example: Choose the word that does not belong.")}
        ${textarea("Options", `${prefix}-options`, lines(content.options), "One option per line.")}
        ${field("Correct index", `${prefix}-correct-index`, content.correct_index ?? "", "Use zero-based index for now.", "type=\"number\"")}
        ${textarea("Explanation", `${prefix}-explanation`, content.explanation || "")}
      `;
    }
    if (type === "fill_gap") {
      return `
        ${textarea("Sentence", `${prefix}-sentence`, content.sentence || "", "Use ___ for the blank.")}
        ${field("Correct answer", `${prefix}-answer`, content.answer || "")}
        ${textarea("Hint", `${prefix}-hint`, content.hint || "")}
      `;
    }
    return `
      ${textarea("Question", `${prefix}-question`, content.question || "", "Keep it short and easy to answer.")}
      ${textarea("Options", `${prefix}-options`, lines(content.options), "One option per line.")}
      ${field("Correct index", `${prefix}-correct-index`, content.correct_index ?? "", "Use zero-based index for now.", "type=\"number\"")}
      ${textarea("Explanation", `${prefix}-explanation`, content.explanation || "")}
    `;
  };

  AdminLearningDayEditor.render = function (state = {}) {
    const day = state.currentDay || {};
    const blocks = day.blocks || [];
    const intro = findFirstBlock(blocks, "intro")?.content_json || {};
    const explanation = findFirstBlock(blocks, "explanation")?.content_json || {};
    const vocabulary = findFirstBlock(blocks, "vocabulary")?.content_json || {};
    const completion = findFirstBlock(blocks, "completion")?.content_json || {};
    const games = gameBlocks(blocks);
    const others = otherBlocks(blocks);

    return `
      <form class="admin-learning-editor" id="admin-learning-day-content-form">
        <div class="admin-learning-sticky">
          <div class="admin-learning-sticky-grid">
            <label>Day
              <input id="learning-edit-day-number" type="number" value="${day.day_number ?? ""}">
            </label>
            <label>Status
              <select id="learning-edit-day-status">
                ${selectOptions(["draft", "published"], day.status || "draft")}
              </select>
            </label>
            <button type="submit">Save</button>
            <button type="button" data-learning-preview="${Number(day.id)}">Preview Day</button>
            <button type="button" data-learning-back-days>Back to Days</button>
          </div>
        </div>

        <section class="admin-learning-card admin-learning-section">
          <div class="admin-learning-section-head">
            <span>1</span>
            <div>
              <h3>Basic Info</h3>
              <p>Set the day label and lightweight learner expectations.</p>
            </div>
          </div>
          <div class="admin-learning-form-grid">
            ${field("Title", "learning-edit-day-title", day.title || "", "Example: am / is / are")}
            ${field("Estimated minutes", "learning-edit-day-minutes", day.estimated_minutes ?? "", "", "type=\"number\"")}
          </div>
          ${textarea("Subtitle", "learning-edit-day-subtitle", day.subtitle || "", "One short sentence explaining what learners will do today.")}
          <div class="admin-learning-form-grid">
            ${field("XP reward", "learning-edit-day-xp", day.xp_reward ?? "", "", "type=\"number\"")}
          </div>
        </section>

        <section class="admin-learning-card admin-learning-section" data-section-block-id="${escapeHtml(findFirstBlock(blocks, "intro")?.id || "")}" data-section-type="intro">
          <div class="admin-learning-section-head">
            <span>2</span>
            <div>
              <h3>Intro</h3>
              <p>This is the first screen learners see before starting the day.</p>
            </div>
          </div>
          ${field("Intro title", "learning-intro-title", intro.title || "")}
          ${textarea("Intro text", "learning-intro-text", intro.text || "")}
          ${field("Button text", "learning-intro-button", intro.button_text || "")}
        </section>

        <section class="admin-learning-card admin-learning-section" data-section-block-id="${escapeHtml(findFirstBlock(blocks, "explanation")?.id || "")}" data-section-type="explanation">
          <div class="admin-learning-section-head">
            <span>3</span>
            <div>
              <h3>Grammar Explanation</h3>
              <p>Keep it light. 3-6 short lines, not a full textbook lesson.</p>
            </div>
          </div>
          ${field("Grammar title", "learning-grammar-title", explanation.title || "")}
          ${textarea("Short explanation", "learning-grammar-text", explanation.text || "")}
          ${textarea("Examples", "learning-grammar-examples", lines(explanation.examples))}
          ${textarea("Common mistake", "learning-grammar-mistake", explanation.common_mistake || "")}
        </section>

        <section class="admin-learning-card admin-learning-section" data-section-block-id="${escapeHtml(findFirstBlock(blocks, "vocabulary")?.id || "")}" data-section-type="vocabulary">
          <div class="admin-learning-section-head">
            <span>4</span>
            <div>
              <h3>Vocabulary</h3>
              <p>Add around 10 words. Users may not see this as a separate lesson yet, but the system can use it later.</p>
            </div>
          </div>
          ${textarea("Words", "learning-vocabulary-words", vocabulary.words_text || "", "Format: word | translation | example sentence")}
        </section>

        <section class="admin-learning-card admin-learning-section">
          <div class="admin-learning-section-head">
            <span>5</span>
            <div>
              <h3>Checking Games</h3>
              <p>Add quick checks that reinforce the lesson. Only games are manually added.</p>
            </div>
          </div>
          <div class="admin-learning-add-game">
            <label>New game type
              <select id="learning-new-game-type">${selectOptions(gameTypes, "multiple_choice")}</select>
            </label>
            <button type="button" data-add-learning-game>Add game</button>
          </div>
          <div class="admin-learning-games">
            ${games.length ? games.map(gameFields).join("") : `<div class="admin-learning-empty">No checking games yet.</div>`}
          </div>
        </section>

        <section class="admin-learning-card admin-learning-section" data-section-block-id="${escapeHtml(findFirstBlock(blocks, "completion")?.id || "")}" data-section-type="completion">
          <div class="admin-learning-section-head">
            <span>6</span>
            <div>
              <h3>Completion</h3>
              <p>This appears after the learner finishes the day.</p>
            </div>
          </div>
          ${field("Completion title", "learning-completion-title", completion.title || "")}
          ${textarea("Completion message", "learning-completion-message", completion.message || "")}
          ${field("XP reward", "learning-completion-xp", completion.xp_reward ?? "", "", "type=\"number\"")}
        </section>

        ${others.length ? `
          <section class="admin-learning-card admin-learning-section">
            <div class="admin-learning-section-head">
              <span>+</span>
              <div>
                <h3>Other Blocks</h3>
                <p>Custom or older block types are preserved here.</p>
              </div>
            </div>
            ${others.map((block) => `
              <div class="admin-learning-block-row">
                <div>
                  <strong>${escapeHtml(block.block_type || "unknown")}</strong>
                  <small>${escapeHtml(JSON.stringify(block.content_json || {}))}</small>
                </div>
                <div class="admin-learning-block-actions">
                  <button type="button" data-delete-block="${Number(block.id)}">Delete</button>
                </div>
              </div>
            `).join("")}
          </section>
        ` : ""}
      </form>
    `;
  };

  AdminLearningDayEditor.collectDay = function () {
    const dayNumber = document.getElementById("learning-edit-day-number")?.value;
    const minutes = document.getElementById("learning-edit-day-minutes")?.value;
    const xp = document.getElementById("learning-edit-day-xp")?.value;
    return {
      day_number: dayNumber === "" ? null : Number(dayNumber),
      title: document.getElementById("learning-edit-day-title")?.value?.trim() || null,
      subtitle: document.getElementById("learning-edit-day-subtitle")?.value?.trim() || null,
      status: document.getElementById("learning-edit-day-status")?.value || "draft",
      estimated_minutes: minutes === "" ? null : Number(minutes),
      xp_reward: xp === "" ? null : Number(xp),
    };
  };

  AdminLearningDayEditor.collectStructuredBlocks = function (day) {
    const blocks = day?.blocks || [];
    const getId = (type) => findFirstBlock(blocks, type)?.id || null;
    const completionXp = document.getElementById("learning-completion-xp")?.value;
    return [
      {
        id: getId("intro"),
        block_type: "intro",
        sort_order: 10,
        content_json: {
          title: document.getElementById("learning-intro-title")?.value?.trim() || "",
          text: document.getElementById("learning-intro-text")?.value?.trim() || "",
          button_text: document.getElementById("learning-intro-button")?.value?.trim() || "",
        },
        is_required: false,
      },
      {
        id: getId("explanation"),
        block_type: "explanation",
        sort_order: 20,
        content_json: {
          title: document.getElementById("learning-grammar-title")?.value?.trim() || "",
          text: document.getElementById("learning-grammar-text")?.value?.trim() || "",
          examples: String(document.getElementById("learning-grammar-examples")?.value || "").split("\n").map((item) => item.trim()).filter(Boolean),
          common_mistake: document.getElementById("learning-grammar-mistake")?.value?.trim() || "",
        },
        is_required: false,
      },
      {
        id: getId("vocabulary"),
        block_type: "vocabulary",
        sort_order: 30,
        content_json: {
          words_text: document.getElementById("learning-vocabulary-words")?.value?.trim() || "",
        },
        is_required: false,
      },
      {
        id: getId("completion"),
        block_type: "completion",
        sort_order: 90,
        content_json: {
          title: document.getElementById("learning-completion-title")?.value?.trim() || "",
          message: document.getElementById("learning-completion-message")?.value?.trim() || "",
          xp_reward: completionXp === "" ? null : Number(completionXp || 0),
        },
        is_required: false,
      },
    ];
  };

  AdminLearningDayEditor.collectGames = function () {
    return Array.from(document.querySelectorAll("[data-game-index]")).map((card, orderIndex) => {
      const index = card.dataset.gameIndex;
      const id = card.dataset.gameId || null;
      const type = document.getElementById(`learning-game-${index}-type`)?.value || "multiple_choice";
      let content = {};
      if (type === "word_shuffle") {
        content = {
          prompt: document.getElementById(`learning-game-${index}-prompt`)?.value?.trim() || "",
          words: String(document.getElementById(`learning-game-${index}-words`)?.value || "").split("\n").map((item) => item.trim()).filter(Boolean),
          correct_sentence: document.getElementById(`learning-game-${index}-correct-sentence`)?.value?.trim() || "",
        };
      } else if (type === "match_words") {
        content = {
          pairs: String(document.getElementById(`learning-game-${index}-pairs`)?.value || "").split("\n").map((line) => {
            const parts = line.split("=");
            return { left: (parts[0] || "").trim(), right: parts.slice(1).join("=").trim() };
          }).filter((pair) => pair.left || pair.right),
        };
      } else if (type === "odd_one_out") {
        const correctIndex = document.getElementById(`learning-game-${index}-correct-index`)?.value;
        content = {
          prompt: document.getElementById(`learning-game-${index}-prompt`)?.value?.trim() || "",
          options: String(document.getElementById(`learning-game-${index}-options`)?.value || "").split("\n").map((item) => item.trim()).filter(Boolean),
          correct_index: correctIndex === "" ? null : Number(correctIndex),
          explanation: document.getElementById(`learning-game-${index}-explanation`)?.value?.trim() || "",
        };
      } else if (type === "fill_gap") {
        content = {
          sentence: document.getElementById(`learning-game-${index}-sentence`)?.value?.trim() || "",
          answer: document.getElementById(`learning-game-${index}-answer`)?.value?.trim() || "",
          hint: document.getElementById(`learning-game-${index}-hint`)?.value?.trim() || "",
        };
      } else {
        const correctIndex = document.getElementById(`learning-game-${index}-correct-index`)?.value;
        content = {
          question: document.getElementById(`learning-game-${index}-question`)?.value?.trim() || "",
          options: String(document.getElementById(`learning-game-${index}-options`)?.value || "").split("\n").map((item) => item.trim()).filter(Boolean),
          correct_index: correctIndex === "" ? null : Number(correctIndex),
          explanation: document.getElementById(`learning-game-${index}-explanation`)?.value?.trim() || "",
        };
      }
      return {
        id,
        block_type: type,
        sort_order: 40 + orderIndex,
        content_json: content,
        is_required: false,
      };
    });
  };
})();
