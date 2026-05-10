window.WordMergeUI = window.WordMergeUI || {};

(function () {
  WordMergeUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  WordMergeUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.remove("vocab-ooo-host", "shadow-writing-host");
      document.body.classList.add("word-merge-active");
      screen.style.display = "block";
    }
    return screen;
  };

  function tileMarkup(tile) {
    if (!tile) return `<div class="word-merge-cell"></div>`;
    const label = WordMergeEngine.tileLabel(tile);
    const level = Math.min(8, Math.max(1, Math.log2(Number(tile.value || 2))));
    return `
      <div class="word-merge-cell has-tile">
        <div class="word-merge-tile level-${level} ${tile.merged ? "is-merged" : ""} ${tile.justSpawned ? "is-new" : ""}">
          <strong>${WordMergeUI.escape(label.english_word)}</strong>
          <span>${WordMergeUI.escape(label.uzbek_meaning)}</span>
          <em>x${Number(tile.value || 2)}</em>
        </div>
      </div>
    `;
  }

  function activeMeta() {
    const state = WordMergeState.get();
    const families = state.activeFamilyIds
      .map((id) => state.families.find((family) => Number(family.id) === Number(id)))
      .filter(Boolean);
    const levels = Array.from(new Set(families.map((family) => family.cefr_level).filter(Boolean))).join(", ");
    const cats = Array.from(new Set(families.map((family) => family.category).filter(Boolean))).join(", ");
    return { levels: levels || "Mixed", categories: cats || "Vocabulary" };
  }

  WordMergeUI.renderLoading = function () {
    const screen = WordMergeUI.screen();
    if (!screen) return;
    screen.innerHTML = `<div class="word-merge-screen"><div class="word-merge-empty">Preparing Word Merge...</div></div>`;
  };

  WordMergeUI.render = function () {
    const screen = WordMergeUI.screen();
    if (!screen) return;
    const state = WordMergeState.get();
    const meta = activeMeta();
    screen.innerHTML = `
      <div class="word-merge-screen">
        <div class="word-merge-top">
          <div>
            <h2>Voxi Word Merge</h2>
            <p>${WordMergeUI.escape(meta.levels)} · ${WordMergeUI.escape(meta.categories)}</p>
          </div>
          <div class="word-merge-actions">
            <button onclick="WordMergeLoader.restart()">Restart</button>
            <button onclick="WordMergeLoader.exit()">Back</button>
          </div>
        </div>
        <div class="word-merge-stats">
          <div><span>Score</span><strong>${Number(state.score || 0)}</strong></div>
          <div><span>Mastered</span><strong>${Number(state.mastered || 0)}</strong></div>
          <div><span>Moves</span><strong>${Number(state.moves || 0)}</strong></div>
        </div>
        <section class="word-merge-board" aria-label="Voxi Word Merge board">
          ${(state.board || []).map((row) => row.map(tileMarkup).join("")).join("")}
        </section>
        <p class="word-merge-hint">Swipe, drag, or use arrow keys. Matching word-family tiles merge and upgrade.</p>
        ${state.gameOver ? `
          <div class="word-merge-result">
            <strong>Game over</strong>
            <span>Score ${Number(state.score || 0)} · ${Number(state.mastered || 0)} mastered words</span>
            <button onclick="WordMergeLoader.restart()">Play again</button>
          </div>
        ` : ""}
      </div>
    `;
  };
})();
