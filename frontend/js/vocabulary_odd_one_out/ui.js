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

  function fullImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `${window.API}${value.startsWith("/") ? value : `/${value}`}`;
  }

  function comboMarkup() {
    const state = VocabularyOddOneOutState.get();
    if (state.comboBreak) {
      return `<div id="vocab-combo" class="vocab-combo is-breaking">x${Number(state.comboBreak)}</div>`;
    }
    if (state.streak >= 3) {
      return `<div id="vocab-combo" class="vocab-combo">x${Number(state.streak)}</div>`;
    }
    return `<div id="vocab-combo" class="vocab-combo is-empty" aria-hidden="true"></div>`;
  }

  function panelStatusMarkup() {
    return `
      <div class="vocab-panel-status">
        ${comboMarkup()}
        <div id="vocab-timer" class="vocab-timer is-calm" aria-live="polite">
          <span class="vocab-timer-number">10</span>
        </div>
      </div>
    `;
  }

  VocabularyOddOneOutUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.remove("shadow-writing-host");
      screen.classList.add("vocab-ooo-host");
      document.body.classList.add("vocab-ooo-active");
      screen.style.display = "block";
    }
    return screen;
  };

  VocabularyOddOneOutUI.renderLoading = function () {
    const screen = VocabularyOddOneOutUI.screen();
    if (!screen) return;
    screen.innerHTML = `<div class="vocab-game-page"><div class="vocab-ooo-empty">Preparing puzzle...</div></div>`;
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
      <div class="vocab-game-page">
        <div class="vocab-game-top">
          <section class="vocab-game-heading" aria-labelledby="vocab-ooo-title">
            <h1 id="vocab-ooo-title">Odd One Out</h1>
            <p>Find the word that does not belong</p>
          </section>
          <button class="vocab-back-btn" onclick="VocabularyOddOneOutGame.exit()" type="button">&larr; Back</button>
        </div>
        <div class="vocab-game-layout">
          <div class="vocab-left-column">
            <section class="vocab-game-board" aria-label="Odd One Out puzzle board">
              <div class="vocab-card-grid">
                ${(set.words || []).map((word) => `
                  <button class="vocab-word-card" data-word-id="${Number(word.id)}" onclick="VocabularyOddOneOutGame.answer(${Number(word.id)})" type="button">
                    <span class="vocab-word-card-text">${VocabularyOddOneOutUI.escape(word.word_text)}</span>
                  </button>
                `).join("")}
              </div>
            </section>
          </div>
          <aside id="vocab-ooo-feedback" class="vocab-side-panel" aria-live="polite">
            <div class="vocab-panel-content vocab-panel-content--initial">
              <p>Find the word that does not belong</p>
            </div>
            ${panelStatusMarkup()}
            <div class="vocab-next-placeholder" aria-hidden="true"></div>
          </aside>
        </div>
      </div>
    `;
    VocabularyOddOneOutGame.startQuestionTimer();
  };

  VocabularyOddOneOutUI.renderFeedback = function ({ selectedWordId, correct, correctWordId, explanation, timedOut = false }) {
    const result = VocabularyOddOneOutState.get().lastResult || {};
    const imageByWordId = new Map(
      (result.word_images || []).map((item) => [Number(item.id), item.image_url || ""])
    );
    const hasAnyImage = Array.from(imageByWordId.values()).some((url) => Boolean(url));
    if (hasAnyImage) document.querySelector(".vocab-game-layout")?.classList.add("is-revealed");
    document.querySelectorAll(".vocab-word-card").forEach((card) => {
      const wordId = Number(card.dataset.wordId);
      const imageUrl = fullImageUrl(imageByWordId.get(wordId));
      card.disabled = true;
      if (imageUrl) card.classList.add("is-revealed");
      if (wordId === Number(correctWordId)) card.classList.add("is-correct");
      if (wordId === Number(selectedWordId) && !correct) card.classList.add("is-wrong");
      if (imageUrl && !card.querySelector(".vocab-word-card-image-slot")) {
        card.insertAdjacentHTML("beforeend", `
          <span class="vocab-word-card-image-slot">
            <img src="${VocabularyOddOneOutUI.escape(imageUrl)}" alt="">
          </span>
        `);
      }
    });
    const feedback = document.getElementById("vocab-ooo-feedback");
    if (!feedback) return;
    feedback.innerHTML = `
      <div class="vocab-panel-content">
        <strong>${timedOut ? "Time's up" : (correct ? "Correct" : "Not quite")}</strong>
        <p>${explanation ? VocabularyOddOneOutUI.escape(explanation) : "Review the odd word, then continue."}</p>
      </div>
      ${panelStatusMarkup()}
      <button class="vocab-next-btn" onclick="VocabularyOddOneOutGame.next()">Next</button>
    `;
  };

  VocabularyOddOneOutUI.renderTimer = function ({ seconds, mode }) {
    const timer = document.getElementById("vocab-timer");
    if (!timer) return;
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    timer.className = "vocab-timer";
    if (mode === "explanation") {
      timer.classList.add("is-explain");
    } else if (safeSeconds <= 3) {
      timer.classList.add("is-danger");
    } else if (safeSeconds <= 6) {
      timer.classList.add("is-warn");
    } else {
      timer.classList.add("is-calm");
    }
    timer.innerHTML = `<span class="vocab-timer-number">${safeSeconds}</span>`;
  };

  VocabularyOddOneOutUI.renderResult = function () {
    const screen = VocabularyOddOneOutUI.screen();
    if (!screen) return;
    const state = VocabularyOddOneOutState.get();
    VocabularyOddOneOutGame.recordSession?.();
    screen.innerHTML = `
      <div class="vocab-game-page">
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
