window.WordShuffleDrag = window.WordShuffleDrag || {};

(function () {
  let active = null;
  let rafId = null;
  let lastPoint = null;

  function pointerPosition(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function nearestSlot(point) {
    let best = null;
    document.querySelectorAll(".word-shuffle-slot").forEach((slot) => {
      const box = slot.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const distance = Math.hypot(point.x - cx, point.y - cy);
      if (distance < 78 && (!best || distance < best.distance)) {
        best = { slot, distance };
      }
    });
    return best?.slot || null;
  }

  function applyPoint(point) {
    if (!active?.el) return;
    active.el.style.transform = `translate3d(${point.x - active.rect.width / 2}px, ${point.y - active.rect.height / 2}px, 0) scale(1.08)`;
  }

  function scheduleMove(point) {
    lastPoint = point;
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      applyPoint(lastPoint);
    });
  }

  function clearMagnet() {
    document.querySelectorAll(".word-shuffle-slot.is-magnetic").forEach((slot) => slot.classList.remove("is-magnetic"));
  }

  function scatterBackToTable() {
    if (!active?.el) return;
    const x = Math.round(12 + Math.random() * 76);
    const y = Math.round(18 + Math.random() * 64);
    const rot = Math.round((Math.random() * 24) - 12);
    active.el.style.setProperty("--x", `${x}%`);
    active.el.style.setProperty("--y", `${y}%`);
    active.el.style.setProperty("--rot", `${rot}deg`);
  }

  function start(event) {
    const target = event.target.closest(".word-shuffle-letter");
    if (!target || target.classList.contains("is-used")) return;
    event.preventDefault();
    const point = pointerPosition(event);
    active = {
      el: target,
      id: target.dataset.letterId,
      startX: point.x,
      startY: point.y,
      dx: 0,
      dy: 0,
      originalParent: target.parentNode,
      nextSibling: target.nextSibling,
      rect: target.getBoundingClientRect(),
    };
    target.style.position = "fixed";
    target.style.left = "0";
    target.style.top = "0";
    applyPoint(point);
    target.classList.add("is-dragging");
    document.body.appendChild(target);
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", end, { passive: false });
    document.addEventListener("pointercancel", end, { passive: false });
  }

  function move(event) {
    if (!active) return;
    event.preventDefault();
    const point = pointerPosition(event);
    active.dx = point.x - active.startX;
    active.dy = point.y - active.startY;
    scheduleMove(point);
    clearMagnet();
    nearestSlot(point)?.classList.add("is-magnetic");
  }

  function resetLetter() {
    if (!active?.el) return;
    active.el.classList.remove("is-dragging");
    active.el.style.position = "";
    active.el.style.left = "";
    active.el.style.top = "";
    active.el.style.transform = "";
    if (active.originalParent) {
      active.originalParent.insertBefore(active.el, active.nextSibling);
    }
  }

  function end(event) {
    if (!active) return;
    event.preventDefault();
    const point = pointerPosition(event);
    const slot = nearestSlot(point);
    clearMagnet();
    const letterId = active.id;
    if (!slot) scatterBackToTable();
    resetLetter();
    active = null;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", end);
    document.removeEventListener("pointercancel", end);
    if (!slot) return;
    WordShuffleEngine.tryPlace(letterId, Number(slot.dataset.slotIndex));
  }

  WordShuffleDrag.bind = function () {
    const table = document.getElementById("word-shuffle-table");
    if (!table) return;
    table.onpointerdown = start;
  };
})();
