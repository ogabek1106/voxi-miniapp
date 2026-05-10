window.WordMergeTheme = window.WordMergeTheme || {};

(function () {
  const PALETTES = [
    { key: "cyan", hue: 190, soft: "#dff7ff", mid: "#0891b2", deep: "#155e75" },
    { key: "rose", hue: 348, soft: "#ffe4ec", mid: "#e11d48", deep: "#9f1239" },
    { key: "violet", hue: 264, soft: "#ede9fe", mid: "#7c3aed", deep: "#4c1d95" },
    { key: "green", hue: 145, soft: "#dcfce7", mid: "#16a34a", deep: "#166534" },
    { key: "orange", hue: 22, soft: "#ffedd5", mid: "#ea580c", deep: "#9a3412" },
    { key: "amber", hue: 38, soft: "#fef3c7", mid: "#d97706", deep: "#92400e" },
    { key: "indigo", hue: 228, soft: "#e0e7ff", mid: "#4f46e5", deep: "#312e81" },
    { key: "teal", hue: 174, soft: "#ccfbf1", mid: "#0d9488", deep: "#115e59" },
  ];

  const CATEGORY_HINTS = [
    { match: /size|shape|general|small|large/i, palette: "cyan" },
    { match: /emotion|feeling|happy|sad|angry/i, palette: "rose" },
    { match: /intelligence|mind|study|academic/i, palette: "violet" },
    { match: /movement|travel|action|go/i, palette: "green" },
    { match: /opinion|bad|negative|quality/i, palette: "orange" },
    { match: /ielts|exam|formal/i, palette: "indigo" },
  ];

  function hash(value) {
    return String(value || "").split("").reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
  }

  function paletteForFamily(family) {
    const text = `${family?.title || ""} ${family?.category || ""}`;
    const hinted = CATEGORY_HINTS.find((item) => item.match.test(text));
    if (hinted) return PALETTES.find((palette) => palette.key === hinted.palette) || PALETTES[0];
    return PALETTES[hash(`${family?.id || ""}-${text}`) % PALETTES.length];
  }

  function levelForValue(value) {
    return Math.max(1, Math.min(8, Math.log2(Number(value || 2))));
  }

  WordMergeTheme.familyPalette = paletteForFamily;

  WordMergeTheme.tileTheme = function (tile) {
    const family = WordMergeState.get().families.find((item) => Number(item.id) === Number(tile.familyId));
    const palette = paletteForFamily(family);
    const level = levelForValue(tile.value);
    const power = Math.min(1, Math.max(0, (level - 1) / 6));
    const saturation = 68 + power * 20;
    const lightTop = 42 - power * 8;
    const lightBottom = 31 - power * 10;
    const borderLight = 54 + power * 10;
    const depth = 0.18 + power * 0.18;
    return {
      level,
      className: `family-${palette.key} power-${level >= 6 ? "high" : level >= 4 ? "mid" : "low"}`,
      style: [
        `--wm-hue:${palette.hue}`,
        `--wm-family-soft:${palette.soft}`,
        `--wm-family-mid:${palette.mid}`,
        `--wm-family-deep:${palette.deep}`,
        `--wm-tile-top:hsl(${palette.hue} ${saturation}% ${lightTop}%)`,
        `--wm-tile-bottom:hsl(${palette.hue} ${saturation}% ${lightBottom}%)`,
        `--wm-tile-border:hsl(${palette.hue} ${Math.min(96, saturation + 4)}% ${borderLight}%)`,
        `--wm-depth:rgba(15, 23, 42, ${depth})`,
        `--wm-ink:#ffffff`,
        `--wm-muted:rgba(255, 255, 255, 0.76)`,
      ].join(";"),
    };
  };

  WordMergeTheme.familyChips = function (familyIds) {
    const families = WordMergeState.get().families || [];
    return (familyIds || [])
      .map((id) => families.find((family) => Number(family.id) === Number(id)))
      .filter(Boolean)
      .map((family) => {
        const palette = paletteForFamily(family);
        return `
          <span class="word-merge-family-chip" style="--wm-family-soft:${palette.soft};--wm-family-mid:${palette.mid};--wm-family-deep:${palette.deep};">
            ${WordMergeUI.escape(family.title || "Family")}
          </span>
        `;
      })
      .join("");
  };
})();
