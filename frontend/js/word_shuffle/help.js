window.WordShuffleHelp = window.WordShuffleHelp || {};

(function () {
  function clearLetterFromSlots(state, letterId) {
    state.slots.forEach((slot) => {
      if (String(slot.letterId) === String(letterId)) {
        slot.value = "";
        slot.letterId = null;
      }
    });
  }

  function findAnchorLetter(state, expected, targetIndex) {
    const targetSlot = state.slots[targetIndex];
    if (targetSlot?.letterId) {
      const current = state.letters.find((letter) => String(letter.id) === String(targetSlot.letterId));
      if (current?.char?.toLowerCase() === expected.toLowerCase()) return current;
    }

    return state.letters.find((letter) => {
      if (String(letter.char || "").toLowerCase() !== expected.toLowerCase()) return false;
      const slotIndex = state.slots.findIndex((slot) => String(slot.letterId) === String(letter.id));
      if (slotIndex === -1) return true;
      const currentSlot = state.slots[slotIndex];
      const correctlyAnchored = String(currentSlot?.value || "").toLowerCase() === String(currentSlot?.expected || "").toLowerCase();
      return slotIndex !== targetIndex && !correctlyAnchored;
    });
  }

  function placeAnchor(state, slotIndex) {
    const slot = state.slots[slotIndex];
    const expected = slot?.expected;
    if (!slot || !expected) return false;
    if (String(slot.value || "").toLowerCase() === String(expected).toLowerCase()) return false;

    const letter = findAnchorLetter(state, expected, slotIndex);
    if (!letter) return false;

    if (slot.letterId && String(slot.letterId) !== String(letter.id)) {
      const displaced = state.letters.find((item) => String(item.id) === String(slot.letterId));
      if (displaced) {
        displaced.used = false;
        WordShuffleLogic.placeLetterNearTable(displaced, state.letters);
      }
    }

    clearLetterFromSlots(state, letter.id);
    slot.value = letter.char;
    slot.letterId = letter.id;
    letter.used = true;
    return true;
  }

  WordShuffleHelp.apply = function () {
    const state = WordShuffleState.get();
    if (state.gameOver || state.solving || state.helpUsed || !state.helpAvailable || state.slots.length <= 2) return;

    const firstPlaced = placeAnchor(state, 0);
    const lastPlaced = placeAnchor(state, state.slots.length - 1);
    state.helpUsed = firstPlaced || lastPlaced || state.helpUsed;
    state.helpAvailable = false;
    WordShuffleUI.renderSlots();
    WordShuffleUI.renderLetters();
    WordShuffleUI.renderHelp();
    if (state.slots.every((slot) => slot.value)) {
      const typed = state.slots.map((slot) => slot.value).join("").toLowerCase();
      const expected = state.slots.map((slot) => slot.expected).join("").toLowerCase();
      if (typed === expected) {
        WordShuffleEngine.solveCurrent();
      } else {
        WordShuffleEngine.rejectCurrent();
      }
    }
  };
})();
