window.WordMergeLoader = window.WordMergeLoader || {};

(function () {
  let startPoint = null;

  function userPayload() {
    const user = window.WebsiteAuthState?.getUser?.() || null;
    const telegramId = window.getTelegramId?.() || user?.telegram_id || null;
    return {
      user_id: user?.id || null,
      telegram_id: telegramId ? Number(telegramId) : null,
    };
  }

  async function finishIfNeeded() {
    const state = WordMergeState.get();
    if (!state.sessionId) return;
    try {
      await WordMergeApi.finishSession(state.sessionId, {
        ...userPayload(),
        score: Number(state.score || 0),
        mastered_count: Number(state.mastered || 0),
        moves_count: Number(state.moves || 0),
        status: state.gameOver ? "game_over" : "finished",
        board_state: { board: state.board },
      });
    } catch (error) {
      console.error("Word Merge finish session error:", error);
    }
  }

  function move(direction) {
    const moved = WordMergeEngine.move(direction);
    if (!moved) return;
    WordMergeUI.render();
    if (WordMergeState.get().gameOver) finishIfNeeded();
  }

  function bindControls() {
    document.onkeydown = function (event) {
      const map = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      if (!map[event.key] || !document.body.classList.contains("word-merge-active")) return;
      event.preventDefault();
      move(map[event.key]);
    };

    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.ontouchstart = (event) => {
      const touch = event.touches?.[0];
      if (touch) startPoint = { x: touch.clientX, y: touch.clientY };
    };
    screen.ontouchend = (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || !startPoint) return;
      const dx = touch.clientX - startPoint.x;
      const dy = touch.clientY - startPoint.y;
      startPoint = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    };
    screen.onpointerdown = (event) => {
      if (event.pointerType === "mouse") startPoint = { x: event.clientX, y: event.clientY };
    };
    screen.onpointerup = (event) => {
      if (event.pointerType !== "mouse" || !startPoint) return;
      const dx = event.clientX - startPoint.x;
      const dy = event.clientY - startPoint.y;
      startPoint = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    };
  }

  WordMergeLoader.start = async function () {
    WordMergeUI.renderLoading();
    try {
      const data = await WordMergeApi.gameData();
      const families = Array.isArray(data?.families) ? data.families : [];
      WordMergeState.reset(families);
      if (!families.length) {
        const screen = WordMergeUI.screen();
        if (screen) {
          screen.innerHTML = `<div class="word-merge-screen"><div class="word-merge-empty">Activate at least one Word Merge family first.</div><button class="word-merge-back" onclick="showAdminWordMerge()">Back</button></div>`;
        }
        return;
      }
      const session = await WordMergeApi.createSession(userPayload());
      WordMergeState.set({ sessionId: session?.session_id || null });
      WordMergeEngine.newGame();
      WordMergeUI.render();
      bindControls();
    } catch (error) {
      console.error("Word Merge load error:", error);
      const screen = WordMergeUI.screen();
      if (screen) screen.innerHTML = `<div class="word-merge-screen"><div class="word-merge-empty">Could not load Word Merge.</div></div>`;
    }
  };

  WordMergeLoader.restart = async function () {
    await finishIfNeeded();
    WordMergeLoader.start();
  };

  WordMergeLoader.exit = async function () {
    await finishIfNeeded();
    document.body.classList.remove("word-merge-active");
    if (typeof showAdminWordMerge === "function") showAdminWordMerge();
  };
})();
