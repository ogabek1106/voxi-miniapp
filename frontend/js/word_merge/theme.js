window.WordMergeTheme = window.WordMergeTheme || {};

(function () {
  const PALETTES = [
    { key: "cyan", hue: 194, soft: "#e7f8ff", mid: "#00baff", deep: "#0284c7" },
    { key: "rose", hue: 348, soft: "#fff1f5", mid: "#fb7185", deep: "#e11d48" },
    { key: "violet", hue: 266, soft: "#f5f0ff", mid: "#a855f7", deep: "#7e22ce" },
    { key: "green", hue: 145, soft: "#ecfdf5", mid: "#22c55e", deep: "#15803d" },
    { key: "orange", hue: 28, soft: "#fff7ed", mid: "#fb923c", deep: "#ea580c" },
    { key: "amber", hue: 42, soft: "#fffbeb", mid: "#f59e0b", deep: "#b45309" },
    { key: "indigo", hue: 228, soft: "#eef2ff", mid: "#6366f1", deep: "#4338ca" },
    { key: "teal", hue: 174, soft: "#ecfeff", mid: "#14b8a6", deep: "#0f766e" },
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
    const glow = 0.16 + power * 0.32;
    const saturation = 74 + power * 12;
    const lightTop = 99 - power * 8;
    const lightBottom = 95 - power * 15;
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
        `--wm-glow:hsla(${palette.hue}, 92%, 55%, ${glow})`,
        `--wm-ink:hsl(${palette.hue} 58% 22%)`,
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
