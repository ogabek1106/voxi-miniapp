window.VocabularyOddOneOutLoader = window.VocabularyOddOneOutLoader || {};

(function () {
  VocabularyOddOneOutLoader.start = async function () {
    VocabularyOddOneOutUI.renderLoading();
    try {
      const data = await VocabularyOddOneOutApi.session();
      const sets = Array.isArray(data?.sets) ? data.sets : [];
      VocabularyOddOneOutState.reset(sets);
      if (!sets.length) {
        const screen = VocabularyOddOneOutUI.screen();
        if (screen) {
          screen.innerHTML = `
            <div class="vocab-ooo-screen">
              <div class="vocab-ooo-empty">No vocabulary puzzles are published yet.</div>
              <button class="vocab-ooo-back" onclick="goHome()">Back to Home</button>
            </div>
          `;
        }
        return;
      }
      VocabularyOddOneOutUI.renderPuzzle();
    } catch (error) {
      console.error("Odd One Out session error:", error);
      const screen = VocabularyOddOneOutUI.screen();
      if (screen) screen.innerHTML = `<div class="vocab-ooo-screen"><div class="vocab-ooo-empty">Could not load puzzle.</div></div>`;
    }
  };
})();

window.showVocabularyOddOneOutEntry = function () {
  VocabularyOddOneOutLoader.start();
};
