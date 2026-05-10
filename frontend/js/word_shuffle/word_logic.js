window.WordShuffleLogic = window.WordShuffleLogic || {};

(function () {
  const TABLE_POSITIONS = [
    [12, 22], [27, 48], [43, 26], [58, 55], [75, 28], [87, 62],
    [18, 72], [36, 78], [52, 18], [68, 78], [82, 42], [9, 52],
    [31, 18], [49, 72], [66, 34], [91, 24],
  ];

  const SIMILAR = {
    a: "oeiu", b: "dp", c: "ks", d: "bt", e: "aio", f: "ph", g: "qj",
    h: "mn", i: "eay", j: "gi", k: "cq", l: "it", m: "nw", n: "mh",
    o: "aeu", p: "bf", q: "gk", r: "nl", s: "cz", t: "lf", u: "oa",
    v: "wy", w: "mv", x: "ks", y: "ij", z: "sc",
  };

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function lettersFromWord(word) {
    return String(word || "").replace(/\s+/g, "").split("");
  }

  function randomLetter(seedLetter) {
    const base = String(seedLetter || "a").toLowerCase();
    const pool = SIMILAR[base] || "abcdefghijklmnopqrstuvwxyz";
    return pool[Math.floor(Math.random() * pool.length)] || "e";
  }

  function distractorCount(entry) {
    if (entry?.difficulty === "hard") return Math.min(5, Math.max(3, Math.floor(String(entry.word || "").length / 3)));
    if (entry?.difficulty === "medium") return 2;
    return 0;
  }

  WordShuffleLogic.shuffle = shuffle;

  WordShuffleLogic.buildPuzzle = function (entry) {
    const wordLetters = lettersFromWord(entry?.word || "");
    const extra = [];
    for (let i = 0; i < distractorCount(entry); i += 1) {
      extra.push(randomLetter(wordLetters[i % Math.max(1, wordLetters.length)]));
    }

    const mixed = shuffle(wordLetters.concat(extra));
    const letters = mixed.map((char, index) => {
      const pos = TABLE_POSITIONS[index % TABLE_POSITIONS.length];
      const jitterX = (Math.random() * 8) - 4;
      const jitterY = (Math.random() * 8) - 4;
      return {
        id: `${Date.now()}-${index}-${char}`,
        char,
        used: false,
        x: Math.max(7, Math.min(93, pos[0] + jitterX)),
        y: Math.max(12, Math.min(88, pos[1] + jitterY)),
        rot: Math.round((Math.random() * 24) - 12),
      };
    });

    return {
      slots: wordLetters.map((char) => ({ expected: char, value: "" })),
      letters,
    };
  };
})();
