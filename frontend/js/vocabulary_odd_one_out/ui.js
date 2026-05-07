window.VocabularyOddOneOutUI = window.VocabularyOddOneOutUI || {};

(function () {
  VocabularyOddOneOutUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  VocabularyOddOneOutUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.remove("shadow-writing-host");
      screen.style.display = "block";
    }
    return screen;
  };

  VocabularyOddOneOutUI.renderLoading = function () {
    const screen = VocabularyOddOneOutUI.screen();
    if (!screen) return;
    screen.innerHTML = `<div class="vocab-ooo-screen"><div class="vocab-ooo-empty">Preparing puzzle...</div></div>`;
  };

  VocabularyOddOneOutUI.renderPuzzle = function () {
    const screen = VocabularyOddOneOutUI.screen();
    if (!screen) return;
    const state = VocabularyOddOneOutState.get();
    const set = state.sets[state.index];
    if (!set) {
      VocabularyOddOneOutUI.renderResult();
      return;
    }
    screen.innerHTML = `
      <div class="vocab-ooo-screen">
        <button class="vocab-ooo-back vocab-ooo-back--floating" onclick="goHome()" type="button">← Back</button>
        <section class="vocab-ooo-hero" aria-labelledby="vocab-ooo-title">
          <h2 id="vocab-ooo-title">Odd One Out</h2>
          <p>Find the word that does not belong</p>
        </section>
        <section class="vocab-ooo-board" aria-label="Odd One Out puzzle board">
          <div class="vocab-ooo-grid">
            ${(set.words || []).map((word) => `
              <button class="vocab-ooo-card" data-word-id="${Number(word.id)}" onclick="VocabularyOddOneOutGame.answer(${Number(word.id)})" type="button">
                <span>${VocabularyOddOneOutUI.escape(word.word_text)}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <div id="vocab-ooo-feedback" class="vocab-ooo-feedback" hidden></div>
      </div>
    `;
  };

  VocabularyOddOneOutUI.renderFeedback = function ({ selectedWordId, correct, correctWordId, explanation }) {
    document.querySelectorAll(".vocab-ooo-card").forEach((card) => {
      const wordId = Number(card.dataset.wordId);
      card.disabled = true;
      if (wordId === Number(correctWordId)) card.classList.add("is-correct");
      if (wordId === Number(selectedWordId) && !correct) card.classList.add("is-wrong");
    });
    const feedback = document.getElementById("vocab-ooo-feedback");
    if (!feedback) return;
    feedback.hidden = false;
    feedback.innerHTML = `
      <strong>${correct ? "Correct" : "Not quite"}</strong>
      ${explanation ? `<p>${VocabularyOddOneOutUI.escape(explanation)}</p>` : ""}
      <button class="vocab-ooo-next" onclick="VocabularyOddOneOutGame.next()">Next</button>
    `;
  };

  VocabularyOddOneOutUI.renderResult = function () {
    const screen = VocabularyOddOneOutUI.screen();
    if (!screen) return;
    const state = VocabularyOddOneOutState.get();
    screen.innerHTML = `
      <div class="vocab-ooo-screen">
        <div class="vocab-ooo-result">
          <h2>Odd One Out</h2>
          <strong>${state.correct} / ${state.sets.length}</strong>
          <p>You completed this vocabulary puzzle session.</p>
          <button class="vocab-ooo-next" onclick="VocabularyOddOneOutLoader.start()">Restart</button>
          <button class="vocab-ooo-back" onclick="goHome()">Back to Home</button>
        </div>
      </div>
    `;
  };
})();
