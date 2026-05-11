window.WordShuffleEngine = window.WordShuffleEngine || {};

(function () {
  function nextEntry() {
    const state = WordShuffleState.get();
    if (!state.entries.length) return null;
    const entry = state.entries[state.entryIndex % state.entries.length];
    state.entryIndex += 1;
    return entry;
  }

  WordShuffleEngine.loadNext = function () {
    const state = WordShuffleState.get();
    const entry = nextEntry();
    if (!entry) {
      WordShuffleEngine.gameOver();
      return;
    }
    const puzzle = WordShuffleLogic.buildPuzzle(entry);
    state.current = entry;
    state.slots = puzzle.slots;
    state.letters = puzzle.letters;
    state.solving = false;
    state.wordStartedAt = Date.now();
    WordShuffleUI.render();
  };

  WordShuffleEngine.tryPlace = function (letterId, slotIndex) {
    const state = WordShuffleState.get();
    if (state.gameOver || state.solving) return false;
    const slot = state.slots[slotIndex];
    const letter = state.letters.find((item) => item.id === letterId);
    if (!slot || !letter || letter.used || slot.value) return false;

    slot.value = letter.char;
    slot.letterId = letter.id;
    letter.used = true;
    WordShuffleUI.renderSlots();
    WordShuffleUI.markLetterUsed(letterId);

    if (state.slots.every((item) => item.value)) {
      const typed = state.slots.map((item) => item.value).join("").toLowerCase();
      const expected = state.slots.map((item) => item.expected).join("").toLowerCase();
      if (typed === expected) {
        WordShuffleEngine.solveCurrent();
      } else {
        WordShuffleEngine.rejectCurrent();
      }
    }
    return true;
  };

  WordShuffleEngine.rejectCurrent = function () {
    const state = WordShuffleState.get();
    state.solving = true;
    WordShuffleStreak.break();
    WordShuffleUI.updateHud();
    WordShuffleUI.showSlotError();
    window.setTimeout(() => {
      state.slots.forEach((slot) => {
        const letter = state.letters.find((item) => item.id === slot.letterId);
        if (letter) {
          letter.used = false;
          WordShuffleLogic.placeLetterNearTable(letter, state.letters);
        }
        slot.value = "";
        slot.letterId = null;
      });
      WordShuffleUI.renderSlots();
      WordShuffleUI.renderLetters();
      state.solving = false;
    }, 420);
  };

  WordShuffleEngine.solveCurrent = function () {
    const state = WordShuffleState.get();
    state.solving = true;
    const elapsed = Math.max(0.1, (Date.now() - state.wordStartedAt) / 1000);
    const fastBonus = elapsed <= 5 ? 2 : elapsed <= 8 ? 1 : 0;
    const streak = WordShuffleStreak.success();
    state.solvedCount += 1;
    state.score += Math.round((state.slots.length * 10) + (streak * 4) + (fastBonus * 12));
    WordShuffleTimer.add(3 + fastBonus);
    WordShuffleUI.updateHud();
    WordShuffleUI.showSolvedInfo();
    window.setTimeout(() => {
      if (!WordShuffleState.get().gameOver) WordShuffleEngine.loadNext();
    }, 1500);
  };

  WordShuffleEngine.gameOver = function () {
    const state = WordShuffleState.get();
    if (state.gameOver) return;
    state.gameOver = true;
    state.solving = false;
    WordShuffleTimer.stop();
    WordShuffleLoader.finishIfNeeded("game_over");
    WordShuffleUI.renderGameOver();
  };
})();
