window.WordShuffleUI = window.WordShuffleUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  WordShuffleUI.escape = escape;

  WordShuffleUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    document.body.classList.add("word-shuffle-active");
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  WordShuffleUI.renderLoading = function () {
    const screen = WordShuffleUI.screen();
    if (screen) screen.innerHTML = `<div class="word-shuffle-screen"><div class="word-shuffle-empty">Preparing Voxi Word Shuffle...</div></div>`;
  };

  WordShuffleUI.render = function () {
    const screen = WordShuffleUI.screen();
    const state = WordShuffleState.get();
    if (!screen || !state.current) return;
    screen.innerHTML = `
      <div class="word-shuffle-screen">
        <div class="word-shuffle-top">
          <div class="word-shuffle-title">
            <h2>Voxi Word Shuffle</h2>
            <p>Drag letters into the slots before time runs out.</p>
          </div>
          <button class="word-shuffle-back" onclick="WordShuffleLoader.exit()">Back</button>
        </div>

        <div class="word-shuffle-hud">
          <div class="word-shuffle-stat"><span>Score</span><strong id="word-shuffle-score">${Number(state.score || 0)}</strong></div>
          <div class="word-shuffle-stat"><span>Solved</span><strong id="word-shuffle-solved">${Number(state.solvedCount || 0)}</strong></div>
          <div class="word-shuffle-stat"><span id="word-shuffle-streak-label">${escape(WordShuffleStreak.label(state.streak))}</span><strong id="word-shuffle-streak">${Number(state.streak || 0)}x</strong></div>
          <div id="word-shuffle-timer" class="word-shuffle-stat word-shuffle-timer"><span>Time</span><strong>${Math.ceil(state.seconds)}s</strong></div>
        </div>

        <section id="word-shuffle-stage" class="word-shuffle-stage">
          <div class="word-shuffle-slots" id="word-shuffle-slots">
            ${state.slots.map((slot, index) => `
              <div class="word-shuffle-slot ${slot.value ? "is-filled" : ""}" data-slot-index="${index}">${escape(slot.value || "")}</div>
            `).join("")}
          </div>
          <div class="word-shuffle-table" id="word-shuffle-table">
            ${state.letters.map((letter) => `
              <button class="word-shuffle-letter ${letter.used ? "is-used" : ""}" type="button" data-letter-id="${escape(letter.id)}" style="--x:${letter.x}%;--y:${letter.y}%;--rot:${letter.rot}deg">${escape(letter.char)}</button>
            `).join("")}
          </div>
        </section>

        <div id="word-shuffle-learn-card" class="word-shuffle-learn-card" aria-live="polite"></div>
      </div>
    `;
    WordShuffleDrag.bind();
    WordShuffleUI.renderTimer();
  };

  WordShuffleUI.renderTimer = function () {
    const state = WordShuffleState.get();
    const timer = document.getElementById("word-shuffle-timer");
    if (!timer) return;
    timer.classList.toggle("is-warm", state.seconds <= 8 && state.seconds > 4);
    timer.classList.toggle("is-hot", state.seconds <= 4);
    const strong = timer.querySelector("strong");
    if (strong) strong.textContent = `${Math.ceil(state.seconds)}s`;
  };

  WordShuffleUI.updateHud = function () {
    const state = WordShuffleState.get();
    const score = document.getElementById("word-shuffle-score");
    const solved = document.getElementById("word-shuffle-solved");
    const streak = document.getElementById("word-shuffle-streak");
    const label = document.getElementById("word-shuffle-streak-label");
    if (score) score.textContent = Number(state.score || 0);
    if (solved) solved.textContent = Number(state.solvedCount || 0);
    if (streak) streak.textContent = `${Number(state.streak || 0)}x`;
    if (label) label.textContent = WordShuffleStreak.label(state.streak);
  };

  WordShuffleUI.renderSlots = function () {
    const state = WordShuffleState.get();
    const host = document.getElementById("word-shuffle-slots");
    if (!host) return;
    host.innerHTML = state.slots.map((slot, index) => `
      <div class="word-shuffle-slot ${slot.value ? "is-filled" : ""}" data-slot-index="${index}">${escape(slot.value || "")}</div>
    `).join("");
  };

  WordShuffleUI.markLetterUsed = function (letterId) {
    document.querySelector(`.word-shuffle-letter[data-letter-id="${CSS.escape(String(letterId))}"]`)?.classList.add("is-used");
  };

  WordShuffleUI.showWrong = function (letterId) {
    const el = document.querySelector(`.word-shuffle-letter[data-letter-id="${CSS.escape(String(letterId))}"]`);
    if (!el) return;
    el.classList.remove("is-wrong");
    void el.offsetWidth;
    el.classList.add("is-wrong");
  };

  WordShuffleUI.showSolvedInfo = function () {
    const state = WordShuffleState.get();
    const entry = state.current || {};
    const card = document.getElementById("word-shuffle-learn-card");
    const stage = document.getElementById("word-shuffle-stage");
    if (stage) {
      stage.classList.remove("is-solved");
      void stage.offsetWidth;
      stage.classList.add("is-solved");
    }
    if (!card) return;
    card.innerHTML = `
      <h3>${escape(entry.word)}</h3>
      <p>${escape(entry.translation || "")}</p>
      ${entry.example_sentence ? `<em>${escape(entry.example_sentence)}</em>` : ""}
    `;
    card.classList.add("is-visible");
  };

  WordShuffleUI.renderGameOver = function () {
    const screen = WordShuffleUI.screen();
    const state = WordShuffleState.get();
    if (!screen) return;
    screen.innerHTML = `
      <div class="word-shuffle-screen">
        <div class="word-shuffle-game-over">
          <h2>Game Over</h2>
          <p>Score: <strong>${Number(state.score || 0)}</strong></p>
          <p>Solved words: <strong>${Number(state.solvedCount || 0)}</strong></p>
          <p>Best streak: <strong>${Number(state.bestStreak || 0)}x</strong></p>
          <div class="word-shuffle-head-actions">
            <button class="word-shuffle-restart" onclick="WordShuffleLoader.restart()">Restart</button>
            <button class="word-shuffle-back" onclick="WordShuffleLoader.exit()">Back</button>
          </div>
        </div>
      </div>
    `;
  };
})();
