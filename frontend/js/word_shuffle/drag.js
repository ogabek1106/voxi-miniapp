window.WordShuffleDrag = window.WordShuffleDrag || {};

(function () {
  let active = null;

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

  function clearMagnet() {
    document.querySelectorAll(".word-shuffle-slot.is-magnetic").forEach((slot) => slot.classList.remove("is-magnetic"));
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
    };
    target.classList.add("is-dragging");
    target.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    if (!active) return;
    event.preventDefault();
    const point = pointerPosition(event);
    active.dx = point.x - active.startX;
    active.dy = point.y - active.startY;
    active.el.style.transform = `translate(calc(-50% + ${active.dx}px), calc(-50% + ${active.dy}px)) rotate(0deg) scale(1.08)`;
    clearMagnet();
    nearestSlot(point)?.classList.add("is-magnetic");
  }

  function resetLetter() {
    if (!active?.el) return;
    active.el.classList.remove("is-dragging");
    active.el.style.transform = "";
  }

  function end(event) {
    if (!active) return;
    const point = pointerPosition(event);
    const slot = nearestSlot(point);
    clearMagnet();
    const letterId = active.id;
    resetLetter();
    active = null;
    if (!slot) return;
    WordShuffleEngine.tryPlace(letterId, Number(slot.dataset.slotIndex));
  }

  WordShuffleDrag.bind = function () {
    const table = document.getElementById("word-shuffle-table");
    if (!table) return;
    table.onpointerdown = start;
    table.onpointermove = move;
    table.onpointerup = end;
    table.onpointercancel = end;
  };
})();
