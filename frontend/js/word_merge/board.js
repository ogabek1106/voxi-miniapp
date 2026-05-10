window.WordMergeBoard = window.WordMergeBoard || {};

(function () {
  WordMergeBoard.SIZE = 4;

  WordMergeBoard.clone = function (board) {
    return board.map((row) => row.map((tile) => tile ? { ...tile } : null));
  };

  WordMergeBoard.empty = function () {
    return Array.from({ length: WordMergeBoard.SIZE }, () => (
      Array.from({ length: WordMergeBoard.SIZE }, () => null)
    ));
  };

  WordMergeBoard.equals = function (a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  WordMergeBoard.emptyCells = function (board) {
    const cells = [];
    board.forEach((row, r) => row.forEach((tile, c) => {
      if (!tile) cells.push({ r, c });
    }));
    return cells;
  };

  WordMergeBoard.activeFamilyIds = function (board) {
    const ids = new Set();
    (board || []).flat().forEach((tile) => {
      if (tile) ids.add(Number(tile.familyId));
    });
    return Array.from(ids);
  };

  WordMergeBoard.hasFamily = function (board, familyId) {
    return WordMergeBoard.activeFamilyIds(board).includes(Number(familyId));
  };

  WordMergeBoard.highestTileValue = function (board, familyId) {
    return Math.max(
      0,
      ...(board || []).flat()
        .filter((tile) => tile && Number(tile.familyId) === Number(familyId))
        .map((tile) => Number(tile.value || 0))
    );
  };
})();
