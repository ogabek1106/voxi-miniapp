window.WordMergeEngine = window.WordMergeEngine || {};

(function () {
  let tileId = 1;

  function nextTileId() {
    tileId += 1;
    return tileId;
  }

  function getFamilyById(id) {
    return WordMergeState.get().families.find((family) => Number(family.id) === Number(id));
  }

  function getTileLabel(tile) {
    const family = getFamilyById(tile.familyId);
    const ladder = family?.ladder || [];
    const step = ladder.find((item) => Number(item.value) === Number(tile.value)) || ladder[0];
    return {
      english_word: step?.english_word || "Word",
      uzbek_meaning: step?.uzbek_meaning || "",
    };
  }

  function targetForTile(tile) {
    return Number(getFamilyById(tile.familyId)?.mastery_target || 128);
  }

  function mergeLine(line) {
    const compact = line.filter(Boolean).map((tile) => ({ ...tile, merged: false, mastered: false, justSpawned: false }));
    const result = [];
    let scoreAdd = 0;
    let masteredAdd = 0;
    const masteredFamilyIds = [];
    for (let index = 0; index < compact.length; index += 1) {
      const current = compact[index];
      const next = compact[index + 1];
      if (next && current.familyId === next.familyId && current.value === next.value) {
        const mergedValue = current.value * 2;
        if (mergedValue >= targetForTile(current)) {
          scoreAdd += mergedValue;
          masteredAdd += 1;
          masteredFamilyIds.push(Number(current.familyId));
        } else {
          result.push({
            id: nextTileId(),
            familyId: current.familyId,
            value: mergedValue,
            merged: true,
          });
          scoreAdd += mergedValue;
        }
        index += 1;
      } else {
        result.push(current);
      }
    }
    while (result.length < WordMergeBoard.SIZE) result.push(null);
    return { line: result, scoreAdd, masteredAdd, masteredFamilyIds };
  }

  function moveBoard(board, direction) {
    const next = WordMergeBoard.empty();
    let scoreAdd = 0;
    let masteredAdd = 0;
    let masteredFamilyIds = [];
    const readLine = (i) => {
      if (direction === "left") return board[i];
      if (direction === "right") return [...board[i]].reverse();
      if (direction === "up") return board.map((row) => row[i]);
      return board.map((row) => row[i]).reverse();
    };
    const writeLine = (i, line) => {
      const normalized = direction === "right" || direction === "down" ? [...line].reverse() : line;
      normalized.forEach((tile, j) => {
        if (direction === "left" || direction === "right") next[i][j] = tile;
        else next[j][i] = tile;
      });
    };
    for (let i = 0; i < WordMergeBoard.SIZE; i += 1) {
      const merged = mergeLine(readLine(i));
      scoreAdd += merged.scoreAdd;
      masteredAdd += merged.masteredAdd;
      masteredFamilyIds = masteredFamilyIds.concat(merged.masteredFamilyIds);
      writeLine(i, merged.line);
    }
    const changed = !WordMergeBoard.equals(board, next);
    return { board: next, changed, scoreAdd, masteredAdd, masteredFamilyIds };
  }

  function canMove(board) {
    if (board.flat().some((tile) => !tile)) return true;
    for (let r = 0; r < WordMergeBoard.SIZE; r += 1) {
      for (let c = 0; c < WordMergeBoard.SIZE; c += 1) {
        const tile = board[r][c];
        const right = board[r]?.[c + 1];
        const down = board[r + 1]?.[c];
        if (right && tile.familyId === right.familyId && tile.value === right.value) return true;
        if (down && tile.familyId === down.familyId && tile.value === down.value) return true;
      }
    }
    return false;
  }

  WordMergeEngine.newGame = function () {
    tileId = 1;
    let board = WordMergeBoard.empty();
    WordMergeFamilyRotation.ensurePair(board);
    board = WordMergeSpawnManager.spawnTile(board, nextTileId);
    board = WordMergeSpawnManager.spawnTile(board, nextTileId);
    WordMergeState.set({
      board,
      score: 0,
      mastered: 0,
      moves: 0,
      activeFamilyIds: WordMergeState.get().activeFamilyIds,
      gameOver: false,
    });
  };

  WordMergeEngine.move = function (direction) {
    const state = WordMergeState.get();
    if (state.gameOver) return false;
    const moved = moveBoard(WordMergeBoard.clone(state.board), direction);
    if (!moved.changed) return false;
    WordMergeFamilyRotation.afterMove(moved.board, moved.masteredFamilyIds);
    const board = WordMergeSpawnManager.spawnTile(moved.board, nextTileId);
    WordMergeFamilyRotation.afterMove(board, []);
    const gameOver = !canMove(board);
    const masteredByFamily = { ...(state.masteredByFamily || {}) };
    moved.masteredFamilyIds.forEach((familyId) => {
      masteredByFamily[familyId] = Number(masteredByFamily[familyId] || 0) + 1;
    });
    WordMergeState.set({
      board,
      score: state.score + moved.scoreAdd,
      mastered: state.mastered + moved.masteredAdd,
      moves: state.moves + 1,
      activeFamilyIds: WordMergeState.get().activeFamilyIds,
      masteredByFamily,
      gameOver,
    });
    return true;
  };

  WordMergeEngine.tileLabel = getTileLabel;
})();
