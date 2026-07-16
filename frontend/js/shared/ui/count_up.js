window.CountUpUI = window.CountUpUI || {};

(function () {
  const activeFrames = new Map();

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  function normalizeInteger(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  function setValue(elements, value, formatter) {
    const text = typeof formatter === "function" ? formatter(value) : String(value);
    elements.forEach((element) => {
      element.textContent = text;
    });
  }

  window.CountUpUI.animateInteger = function ({
    key = "default",
    elements = [],
    card = null,
    fromValue = 0,
    toValue = 0,
    formatter = null,
    animate = true
  } = {}) {
    const targets = Array.from(elements || []).filter(Boolean);
    const from = normalizeInteger(fromValue);
    const to = normalizeInteger(toValue);
    const distance = Math.abs(to - from);

    if (!targets.length) return;

    if (activeFrames.has(key)) {
      window.cancelAnimationFrame?.(activeFrames.get(key));
      activeFrames.delete(key);
    }

    if (
      !animate ||
      from === to ||
      typeof window.requestAnimationFrame !== "function" ||
      prefersReducedMotion()
    ) {
      setValue(targets, to, formatter);
      return;
    }

    const startedAt = performance.now();
    const duration = Math.max(760, Math.min(1350, 620 + distance * 42));
    const isIncrease = to > from;
    if (card) {
      card.classList.remove("is-growing", "is-spending", "is-changing");
      card.classList.add("is-changing", isIncrease ? "is-growing" : "is-spending");
    }

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const current = Math.round(from + (to - from) * eased);
      setValue(targets, current, formatter);

      if (progress < 1) {
        activeFrames.set(key, window.requestAnimationFrame(tick));
        return;
      }

      setValue(targets, to, formatter);
      activeFrames.delete(key);
      if (card) card.classList.remove("is-growing", "is-spending", "is-changing");
    }

    activeFrames.set(key, window.requestAnimationFrame(tick));
  };
})();
