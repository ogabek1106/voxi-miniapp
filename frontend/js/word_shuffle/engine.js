window.WordShuffleEngine = window.WordShuffleEngine || {};

(function () {
  let solveTimeoutId = null;

  function clearSolveTimeout() {
    if (solveTimeoutId) window.clearTimeout(solveTimeoutId);
    solveTimeoutId = null;
  }

  function nextEntry() {
    const state = WordShuffleState.get();
    if (!state.entries.length) return null;
    const entry = state.entries[state.entryIndex % state.entries.length];
    state.entryIndex += 1;
    return entry;
  }

  WordShuffleEngine.loadNext = function () {
    clearSolveTimeout();
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

  function expectedWord() {
    const state = WordShuffleState.get();
    return state.slots.map((item) => item.expected).join("").toLowerCase();
  }

  function currentWord() {
    const state = WordShuffleState.get();
    return state.slots.map((item) => item.value).join("").toLowerCase();
  }

  WordShuffleEngine.liftLetter = function (letterId) {
    const state = WordShuffleState.get();
    const slot = state.slots.find((item) => String(item.letterId) === String(letterId));
    const letter = state.letters.find((item) => String(item.id) === String(letterId));
    if (!slot || !letter) return;
    slot.value = "";
    slot.letterId = null;
    letter.used = false;
    WordShuffleUI.renderSlots();
  };

  WordShuffleEngine.tryPlace = function (letterId, slotIndex) {
    const state = WordShuffleState.get();
    if (state.gameOver || state.solving) return false;
    const slot = state.slots[slotIndex];
    const letter = state.letters.find((item) => item.id === letterId);
    if (!slot || !letter) return false;

    const oldSlot = state.slots.find((item) => String(item.letterId) === String(letterId));
    if (oldSlot) {
      oldSlot.value = "";
      oldSlot.letterId = null;
    }

    if (slot.letterId && String(slot.letterId) !== String(letterId)) {
      const displaced = state.letters.find((item) => String(item.id) === String(slot.letterId));
      if (displaced) {
        displaced.used = false;
        WordShuffleLogic.placeLetterNearTable(displaced, state.letters);
      }
    }

    slot.value = letter.char;
    slot.letterId = letter.id;
    letter.used = true;
    WordShuffleUI.renderSlots();
    WordShuffleUI.renderLetters();

    if (state.slots.every((item) => item.value)) {
      if (currentWord() === expectedWord()) {
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
      state.solving = false;
    }, 420);
  };

  WordShuffleEngine.solveCurrent = function () {
    const state = WordShuffleState.get();
    clearSolveTimeout();
    state.solving = true;
    const elapsed = Math.max(0.1, (Date.now() - state.wordStartedAt) / 1000);
    const fastBonus = elapsed <= 5 ? 2 : elapsed <= 8 ? 1 : 0;
    const streak = WordShuffleStreak.success();
    state.solvedCount += 1;
    state.score += Math.round((state.slots.length * 10) + (streak * 4) + (fastBonus * 12));
    WordShuffleTimer.add(3 + fastBonus);
    WordShuffleUI.updateHud();
    WordShuffleUI.showSolvedInfo();
    solveTimeoutId = window.setTimeout(() => {
      WordShuffleEngine.continueAfterSolved();
    }, 5000);
  };

  WordShuffleEngine.continueAfterSolved = function () {
    const state = WordShuffleState.get();
    clearSolveTimeout();
    if (!state.gameOver && state.solving) WordShuffleEngine.loadNext();
  };

  WordShuffleEngine.gameOver = function () {
    const state = WordShuffleState.get();
    if (state.gameOver) return;
    clearSolveTimeout();
    state.gameOver = true;
    state.solving = false;
    WordShuffleTimer.stop();
    WordShuffleLoader.finishIfNeeded("game_over");
    WordShuffleUI.renderGameOver();
  };
})();
