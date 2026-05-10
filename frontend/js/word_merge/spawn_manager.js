window.WordMergeSpawnManager = window.WordMergeSpawnManager || {};

(function () {
  const SPAWN_VALUE = 2;

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function chooseWeighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.familyId;
    }
    return items[0]?.familyId || null;
  }

  function familyWeight(board, familyId, baseWeight) {
    const highest = WordMergeBoard.highestTileValue(board, familyId);
    const softHelp = highest >= 32 ? 0.10 : highest >= 16 ? 0.06 : highest >= 8 ? 0.03 : 0;
    return baseWeight + softHelp;
  }

  WordMergeSpawnManager.spawnTile = function (board, createTileId) {
    const empty = WordMergeBoard.emptyCells(board);
    if (!empty.length) return board;

    const pair = WordMergeFamilyRotation.ensurePair(board);
    const primaryFamilyId = pair.primaryFamilyId;
    const secondaryFamilyId = pair.secondaryFamilyId;
    if (!primaryFamilyId && !secondaryFamilyId) return board;

    const weighted = [];
    if (primaryFamilyId) {
      weighted.push({ familyId: primaryFamilyId, weight: familyWeight(board, primaryFamilyId, 0.74) });
    }
    if (secondaryFamilyId) {
      weighted.push({ familyId: secondaryFamilyId, weight: familyWeight(board, secondaryFamilyId, 0.26) });
    }

    const familyId = chooseWeighted(weighted);
    const spot = randomItem(empty);
    board[spot.r][spot.c] = {
      id: createTileId(),
      familyId: Number(familyId),
      value: SPAWN_VALUE,
      justSpawned: true,
    };
    return board;
  };
})();
