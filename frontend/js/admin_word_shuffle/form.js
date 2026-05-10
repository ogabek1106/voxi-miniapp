window.AdminWordShuffleForm = window.AdminWordShuffleForm || {};

(function () {
  const LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
  const DIFFICULTIES = ["easy", "medium", "hard"];

  function option(value, selected, label) {
    return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label || value || "Not set"}</option>`;
  }

  AdminWordShuffleForm.render = function () {
    const host = document.getElementById("admin-word-shuffle-form-host");
    if (!host) return;
    const editing = AdminWordShuffleState.getEditing();
    host.innerHTML = `
      <form id="admin-word-shuffle-form" class="admin-word-shuffle-card">
        <h3>${editing ? "Edit word entry" : "Create word entry"}</h3>
        <div id="admin-word-shuffle-message" class="admin-word-shuffle-message" hidden></div>

        <label>English word</label>
        <input id="word-shuffle-word" value="${AdminWordShuffleUI.escape(editing?.word || "")}" placeholder="exhausted" required>

        <label>Uzbek translation</label>
        <input id="word-shuffle-translation" value="${AdminWordShuffleUI.escape(editing?.translation || "")}" placeholder="juda charchagan" required>

        <label>Example sentence</label>
        <textarea id="word-shuffle-example" placeholder="I was exhausted after work.">${AdminWordShuffleUI.escape(editing?.example_sentence || "")}</textarea>

        <div class="admin-word-shuffle-two">
          <div>
            <label>CEFR level</label>
            <select id="word-shuffle-level">${LEVELS.map((value) => option(value, editing?.cefr_level || "")).join("")}</select>
          </div>
          <div>
            <label>Difficulty</label>
            <select id="word-shuffle-difficulty">${DIFFICULTIES.map((value) => option(value, editing?.difficulty || "easy", value[0].toUpperCase() + value.slice(1))).join("")}</select>
          </div>
        </div>

        <label>Category</label>
        <input id="word-shuffle-category" value="${AdminWordShuffleUI.escape(editing?.category || "")}" placeholder="Emotion, Work, IELTS">

        <div class="admin-word-shuffle-preview">
          <strong>Gameplay preview</strong>
          <div id="admin-word-shuffle-preview-word"></div>
        </div>

        <div class="admin-word-shuffle-actions">
          <button class="admin-word-shuffle-primary" type="submit">${editing ? "Save changes" : "Save word"}</button>
          ${editing ? `<button class="admin-word-shuffle-secondary" type="button" onclick="AdminWordShuffleForm.newEntry()">New</button>` : ""}
        </div>
      </form>
    `;
    document.getElementById("admin-word-shuffle-form")?.addEventListener("submit", AdminWordShuffleForm.submit);
    document.getElementById("word-shuffle-word")?.addEventListener("input", AdminWordShuffleForm.renderPreview);
    AdminWordShuffleForm.renderPreview();
  };

  AdminWordShuffleForm.renderPreview = function () {
    const host = document.getElementById("admin-word-shuffle-preview-word");
    const word = document.getElementById("word-shuffle-word")?.value.trim() || "exhausted";
    if (!host) return;
    host.innerHTML = `
      <div class="admin-word-shuffle-slots">${word.split("").map(() => `<span></span>`).join("")}</div>
      <div class="admin-word-shuffle-letters">${word.split("").sort(() => Math.random() - 0.5).map((letter) => `<b>${AdminWordShuffleUI.escape(letter)}</b>`).join("")}</div>
    `;
  };

  AdminWordShuffleForm.collect = function () {
    return {
      word: document.getElementById("word-shuffle-word")?.value.trim() || "",
      translation: document.getElementById("word-shuffle-translation")?.value.trim() || "",
      example_sentence: document.getElementById("word-shuffle-example")?.value.trim() || null,
      cefr_level: document.getElementById("word-shuffle-level")?.value || null,
      category: document.getElementById("word-shuffle-category")?.value.trim() || null,
      difficulty: document.getElementById("word-shuffle-difficulty")?.value || "easy",
      status: AdminWordShuffleState.getEditing()?.status || "inactive",
    };
  };

  AdminWordShuffleForm.submit = async function (event) {
    event.preventDefault();
    const payload = AdminWordShuffleForm.collect();
    if (!payload.word || !payload.translation) {
      AdminWordShuffleUI.renderMessage("Add the word and Uzbek translation.", "error");
      return;
    }
    try {
      const editing = AdminWordShuffleState.getEditing();
      if (editing) await AdminWordShuffleApi.update(editing.id, payload);
      else await AdminWordShuffleApi.create(payload);
      AdminWordShuffleState.setEditing(null);
      AdminWordShuffleUI.renderMessage("Word saved.", "success");
      await AdminWordShuffleLoader.loadList();
      AdminWordShuffleForm.render();
    } catch (error) {
      console.error("Word Shuffle save error:", error);
      AdminWordShuffleUI.renderMessage("Could not save this word.", "error");
    }
  };

  AdminWordShuffleForm.newEntry = function () {
    AdminWordShuffleState.setEditing(null);
    AdminWordShuffleForm.render();
  };
})();
