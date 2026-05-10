window.WordMergeEngine = window.WordMergeEngine || {};

(function () {
  const SIZE = 4;
  const SPAWN_VALUE = 2;
  let tileId = 1;

  function cloneBoard(board) {
    return board.map((row) => row.map((tile) => tile ? { ...tile } : null));
  }

  function boardsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function emptyBoard() {
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
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

  function activeFamilies(board) {
    const ids = new Set();
    board.flat().forEach((tile) => {
      if (tile) ids.add(Number(tile.familyId));
    });
    return Array.from(ids);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function chooseSpawnFamily(board) {
    const state = WordMergeState.get();
    const families = state.families || [];
    if (!families.length) return null;
    const activeIds = activeFamilies(board);
    const active = activeIds.map(getFamilyById).filter(Boolean);
    if (active.length && (active.length >= 4 || Math.random() < 0.78)) {
      return randomItem(active);
    }
    const candidates = families.filter((family) => !activeIds.includes(Number(family.id)));
    return randomItem(candidates.length ? candidates : families);
  }

  function spawnTile(board) {
    const empty = [];
    board.forEach((row, r) => row.forEach((tile, c) => {
      if (!tile) empty.push({ r, c });
    }));
    if (!empty.length) return board;
    const family = chooseSpawnFamily(board);
    if (!family) return board;
    const spot = randomItem(empty);
    board[spot.r][spot.c] = {
      id: tileId++,
      familyId: Number(family.id),
      value: SPAWN_VALUE,
      justSpawned: true,
    };
    return board;
  }

  function targetForTile(tile) {
    return Number(getFamilyById(tile.familyId)?.mastery_target || 128);
  }

  function mergeLine(line) {
    const compact = line.filter(Boolean).map((tile) => ({ ...tile, merged: false, mastered: false, justSpawned: false }));
    const result = [];
    let scoreAdd = 0;
    let masteredAdd = 0;
    for (let index = 0; index < compact.length; index += 1) {
      const current = compact[index];
      const next = compact[index + 1];
      if (next && current.familyId === next.familyId && current.value === next.value) {
        const mergedValue = current.value * 2;
        if (mergedValue >= targetForTile(current)) {
          scoreAdd += mergedValue;
          masteredAdd += 1;
        } else {
          result.push({
            id: tileId++,
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
    while (result.length < SIZE) result.push(null);
    return { line: result, scoreAdd, masteredAdd };
  }

  function moveBoard(board, direction) {
    const next = emptyBoard();
    let scoreAdd = 0;
    let masteredAdd = 0;
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
    for (let i = 0; i < SIZE; i += 1) {
      const merged = mergeLine(readLine(i));
      scoreAdd += merged.scoreAdd;
      masteredAdd += merged.masteredAdd;
      writeLine(i, merged.line);
    }
    const changed = !boardsEqual(board, next);
    return { board: next, changed, scoreAdd, masteredAdd };
  }

  function canMove(board) {
    if (board.flat().some((tile) => !tile)) return true;
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
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
    let board = emptyBoard();
    board = spawnTile(spawnTile(board));
    WordMergeState.set({
      board,
      score: 0,
      mastered: 0,
      moves: 0,
      activeFamilyIds: activeFamilies(board),
      gameOver: false,
    });
  };

  WordMergeEngine.move = function (direction) {
    const state = WordMergeState.get();
    if (state.gameOver) return false;
    const moved = moveBoard(cloneBoard(state.board), direction);
    if (!moved.changed) return false;
    const board = spawnTile(moved.board);
    const gameOver = !canMove(board);
    WordMergeState.set({
      board,
      score: state.score + moved.scoreAdd,
      mastered: state.mastered + moved.masteredAdd,
      moves: state.moves + 1,
      activeFamilyIds: activeFamilies(board),
      gameOver,
    });
    return true;
  };

  WordMergeEngine.tileLabel = getTileLabel;
})();
