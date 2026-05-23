window.MatchWordsUI = window.MatchWordsUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function renderCard(pair, side) {
    const text = side === "english" ? pair.english_text : pair.translation_text;
    const selected = MatchWordsState.get().selectedEnglishId === pair.uid && side === "english";
    return `
      <button
        type="button"
        class="match-word-card ${selected ? "is-selected" : ""} ${pair.removing ? "is-removing is-disabled" : ""} ${pair.entering ? "is-entering" : ""}"
        data-uid="${escape(pair.uid)}"
        data-side="${side}"
        draggable="false"
      >${escape(text)}</button>
    `;
  }

  function handleCardPress(event, button) {
    if (!button || button.classList.contains("is-disabled")) return;
    if (button.dataset.pressHandled === "1") return;
    button.dataset.pressHandled = "1";
    window.setTimeout(() => {
      button.dataset.pressHandled = "0";
    }, 80);
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    MatchWordsAnimations.tapGlow(event);
    MatchWordsEngine.select(button.dataset.uid, button.dataset.side);
  }

  function handleBoardPress(event) {
    const button = event.target?.closest?.(".match-word-card");
    if (!button) return;
    handleCardPress(event, button);
  }

  function bindCards() {
    const board = document.getElementById("match-words-board");
    if (board) {
      board.addEventListener("pointerdown", handleBoardPress, { capture: true, passive: false });
      board.addEventListener("touchstart", handleBoardPress, { capture: true, passive: false });
      board.addEventListener("mousedown", handleBoardPress, { capture: true });
    }

    document.querySelectorAll(".match-word-card").forEach((button) => {
      button.addEventListener("dragstart", (event) => event.preventDefault());
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  MatchWordsUI.screen = function () {
    return document.getElementById("screen-mocks");
  };

  MatchWordsUI.renderLoading = function () {
    hideAllScreens();
    window.hideAnnouncement?.();
    window.setBottomNavVisible?.(false);
    document.documentElement.classList.add("match-words-active");
    document.body.classList.add("match-words-active");
    const screen = MatchWordsUI.screen();
    if (!screen) return;
    screen.style.display = "block";
    screen.innerHTML = `
      <div class="match-words-screen">
        <div class="match-words-shell">
          <div class="match-words-empty">Preparing Match Words...</div>
        </div>
      </div>
    `;
  };

  MatchWordsUI.renderEmpty = function (message) {
    const screen = MatchWordsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="match-words-screen">
        <div class="match-words-shell">
          <div class="match-words-empty">
            <span>${escape(message || "Match Words is being prepared.")}</span>
            <button type="button" onclick="MatchWordsLoader.exit()">Back</button>
          </div>
        </div>
      </div>
    `;
  };

  MatchWordsUI.renderGame = function () {
    const screen = MatchWordsUI.screen();
    const state = MatchWordsState.get();
    if (!screen) return;
    const rightPairs = MatchWordsState.getRightItems();
    screen.innerHTML = `
      <div class="match-words-screen" id="match-words-screen">
        <div class="match-words-shell">
          <div id="match-words-floats"></div>
          <header class="match-words-top">
            <div id="match-words-timer" class="match-words-timer is-blue" style="--timer-progress: 100%;">
              <div class="match-words-timer-track" aria-hidden="true">
                <span class="match-words-timer-fill"></span>
                <span class="match-words-timer-handle"></span>
              </div>
              <span id="match-words-timer-label" class="match-words-timer-label">60s</span>
            </div>
            <div id="match-words-combo" class="match-words-combo"></div>
            <div class="match-words-stats">
              <span id="match-words-matches">Matches ${Number(state.correctCount || 0)}</span>
              <span id="match-words-best">Best x${Number(state.bestCombo || 0)}</span>
            </div>
          </header>
          <main class="match-words-board" id="match-words-board">
            <section class="match-words-column" aria-label="English">
              ${state.visiblePairs.map((pair) => renderCard(pair, "english")).join("")}
            </section>
            <section class="match-words-column" aria-label="Uzbek translations">
              ${rightPairs.map((pair) => renderCard(pair, "translation")).join("")}
            </section>
          </main>
        </div>
      </div>
    `;
    MatchWordsTimer.render();
    MatchWordsUI.updateCombo(false);
    MatchWordsUI.updateStats();
    bindCards();
    setTimeout(() => MatchWordsState.markEntered(), 300);
  };

  MatchWordsUI.updateSelection = function () {
    document.querySelectorAll(".match-word-card.is-selected").forEach((el) => el.classList.remove("is-selected"));
    const selected = MatchWordsState.get().selectedEnglishId;
    if (!selected) return;
    document.querySelector(`.match-word-card[data-uid="${cssEscape(selected)}"][data-side="english"]`)?.classList.add("is-selected");
  };

  MatchWordsUI.updateCombo = function (pop) {
    const combo = Number(MatchWordsState.get().combo || 0);
    const el = document.getElementById("match-words-combo");
    if (!el) return;
    el.className = `match-words-combo ${combo > 0 ? "is-visible" : ""} combo-${Math.min(combo, 4)} ${pop ? "is-pop" : ""}`;
    el.textContent = combo > 0 ? `x${combo} COMBO` : "";
    if (pop) setTimeout(() => el.classList.remove("is-pop"), 460);
  };

  MatchWordsUI.updateStats = function () {
    const state = MatchWordsState.get();
    const matches = document.getElementById("match-words-matches");
    const best = document.getElementById("match-words-best");
    if (matches) matches.textContent = `Matches ${Number(state.correctCount || 0)}`;
    if (best) best.textContent = `Best x${Number(state.bestCombo || 0)}`;
  };

  MatchWordsUI.renderResult = function (result = {}) {
    const root = document.getElementById("match-words-screen");
    const state = MatchWordsState.get();
    if (!root) return;
    root.classList.add("is-game-over");
    root.querySelectorAll(".match-word-card").forEach((button) => button.classList.add("is-disabled"));
    const survived = Math.max(0, Math.round(Number(state.survivedSeconds || 0)));
    const xp = Number(result.xp_earned ?? state.xpEarned ?? 0);
    const card = document.createElement("section");
    card.className = "match-words-result";
    card.innerHTML = `
      <h2>Game Over</h2>
      <div class="match-words-result-grid">
        <div>Survived<strong>${survived}s</strong></div>
        <div>Matches<strong>${Number(state.correctCount || 0)}</strong></div>
        <div>Best combo<strong>x${Number(state.bestCombo || 0)}</strong></div>
        <div>XP earned<strong>${xp}</strong></div>
      </div>
      <div class="match-words-result-actions">
        <button type="button" onclick="MatchWordsLoader.restart()">Play Again</button>
        <button type="button" onclick="MatchWordsLoader.exit()">Exit</button>
      </div>
    `;
    root.querySelector(".match-words-shell")?.appendChild(card);
  };
})();
