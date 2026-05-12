window.WordShuffleScoring = window.WordShuffleScoring || {};

(function () {
  const LEVEL_BASE = {
    A1: 10,
    A2: 15,
    B1: 25,
    B2: 40,
    C1: 70,
    C2: 90,
  };

  const DIFFICULTY_BASE = {
    easy: 10,
    medium: 25,
    hard: 45,
  };

  function baseScore(entry) {
    const level = String(entry?.cefr_level || "").toUpperCase();
    if (LEVEL_BASE[level]) return LEVEL_BASE[level];
    const difficulty = String(entry?.difficulty || "").toLowerCase();
    return DIFFICULTY_BASE[difficulty] || 20;
  }

  function speedBonus(seconds) {
    if (seconds < 2) return 35;
    if (seconds < 4) return 22;
    if (seconds < 7) return 10;
    return 0;
  }

  WordShuffleScoring.calculate = function ({ entry, seconds, streak, helpUsed }) {
    const raw = baseScore(entry) + speedBonus(Number(seconds || 0));
    const multiplier = 1 + Math.min(Math.max(Number(streak || 1) - 1, 0), 10) * 0.08;
    const helped = helpUsed ? 0.8 : 1;
    return Math.max(1, Math.round(raw * multiplier * helped));
  };
})();
