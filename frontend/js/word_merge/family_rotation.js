window.WordMergeFamilyRotation = window.WordMergeFamilyRotation || {};

(function () {
  function familyExists(familyId) {
    return WordMergeState.get().families.some((family) => Number(family.id) === Number(familyId));
  }

  function nextFamilyId(excludedIds, queueOverride = null) {
    const state = WordMergeState.get();
    const excluded = new Set((excludedIds || []).map(Number));
    const queue = (queueOverride || state.familyQueue || []).filter(familyExists);
    const fromQueue = queue.find((id) => !excluded.has(Number(id)));
    if (fromQueue) return Number(fromQueue);
    const fallback = (state.families || []).find((family) => !excluded.has(Number(family.id)));
    return fallback ? Number(fallback.id) : null;
  }

  function rotateQueue(consumedId) {
    const state = WordMergeState.get();
    const queue = (state.familyQueue || []).filter(familyExists).map(Number);
    if (!consumedId) return queue;
    return [...queue.filter((id) => id !== Number(consumedId)), Number(consumedId)];
  }

  WordMergeFamilyRotation.ensurePair = function (board) {
    const state = WordMergeState.get();
    const families = state.families || [];
    if (!families.length) return { primaryFamilyId: null, secondaryFamilyId: null };

    let primaryFamilyId = Number(state.primaryFamilyId || 0) || null;
    let secondaryFamilyId = Number(state.secondaryFamilyId || 0) || null;

    if (!familyExists(primaryFamilyId)) {
      primaryFamilyId = nextFamilyId([]);
    }
    if (!familyExists(secondaryFamilyId) || secondaryFamilyId === primaryFamilyId) {
      secondaryFamilyId = nextFamilyId([primaryFamilyId]);
    }

    WordMergeState.set({
      primaryFamilyId,
      secondaryFamilyId,
      activeFamilyIds: [primaryFamilyId, secondaryFamilyId].filter(Boolean),
      familyQueue: state.familyQueue?.length ? state.familyQueue : families.map((family) => Number(family.id)),
    });
    return { primaryFamilyId, secondaryFamilyId };
  };

  WordMergeFamilyRotation.afterMove = function (board, masteredFamilyIds) {
    let state = WordMergeState.get();
    let primaryFamilyId = Number(state.primaryFamilyId || 0) || null;
    let secondaryFamilyId = Number(state.secondaryFamilyId || 0) || null;
    let familyQueue = state.familyQueue || [];

    const primaryMastered = (masteredFamilyIds || []).map(Number).includes(Number(primaryFamilyId));
    const primaryGone = primaryFamilyId && !WordMergeBoard.hasFamily(board, primaryFamilyId);
    const shouldRotate = primaryMastered || primaryGone;

    if (shouldRotate && secondaryFamilyId) {
      familyQueue = rotateQueue(primaryFamilyId);
      primaryFamilyId = secondaryFamilyId;
      secondaryFamilyId = nextFamilyId([primaryFamilyId], familyQueue);
    }

    WordMergeState.set({
      primaryFamilyId,
      secondaryFamilyId,
      familyQueue,
      activeFamilyIds: [primaryFamilyId, secondaryFamilyId].filter(Boolean),
    });
  };
})();
