window.VoxiFeedbackUI = window.VoxiFeedbackUI || {};

(function () {
  let active = null;
  let selectedRating = 0;
  let pendingSubmit = null;

  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function remove() {
    const old = document.getElementById("voxi-feedback-overlay");
    if (old) old.remove();
    active = null;
    selectedRating = 0;
    pendingSubmit = null;
  }

  function renderStars() {
    return [1, 2, 3, 4, 5].map((value) => `
      <button
        type="button"
        class="voxi-feedback-star ${value <= selectedRating ? "is-selected" : ""}"
        data-rating="${value}"
        aria-label="${value} star${value === 1 ? "" : "s"}"
      >&#9733;</button>
    `).join("");
  }

  function bindStars() {
    const overlay = document.getElementById("voxi-feedback-overlay");
    if (!overlay) return;
    overlay.querySelectorAll(".voxi-feedback-star").forEach((star) => {
      star.onclick = () => {
        selectedRating = Number(star.dataset.rating || 0);
        const row = overlay.querySelector(".voxi-feedback-stars");
        if (row) row.innerHTML = renderStars();
        bindStars();
      };
    });
  }

  function bindMain() {
    const overlay = document.getElementById("voxi-feedback-overlay");
    if (!overlay) return;
    bindStars();

    const submitBtn = overlay.querySelector("[data-feedback-submit]");
    if (submitBtn) submitBtn.onclick = () => {
      if (!selectedRating) {
        overlay.querySelector(".voxi-feedback-hint")?.classList.add("is-visible");
        return;
      }
      const comment = overlay.querySelector("#voxi-feedback-comment")?.value?.trim() || "";
      if (comment) {
        pendingSubmit = { rating: selectedRating, comment };
        renderPermission();
        return;
      }
      active?.onSubmit?.({ rating: selectedRating, comment: "", public_permission: false, status: "submitted" });
      remove();
    };

    const skipBtn = overlay.querySelector("[data-feedback-skip]");
    if (skipBtn) skipBtn.onclick = () => {
      active?.onSkip?.();
      remove();
    };

    overlay.onclick = (event) => {
      if (event.target !== overlay) return;
      active?.onSkip?.();
      remove();
    };
  }

  function renderPermission() {
    const card = document.querySelector("#voxi-feedback-overlay .voxi-feedback-card");
    if (!card || !pendingSubmit) return;
    card.innerHTML = `
      <div class="voxi-feedback-icon">&#9733;</div>
      <h3>Can we use your feedback publicly?</h3>
      <p>Your written feedback will stay private for now. This only saves permission for a future public showcase.</p>
      <div class="voxi-feedback-actions">
        <button type="button" class="voxi-feedback-primary" data-feedback-public-yes>Yes, you can</button>
        <button type="button" class="voxi-feedback-secondary" data-feedback-public-no>Keep private</button>
      </div>
    `;
    card.querySelector("[data-feedback-public-yes]")?.addEventListener("click", () => {
      active?.onSubmit?.({ ...pendingSubmit, public_permission: true, status: "submitted" });
      remove();
    });
    card.querySelector("[data-feedback-public-no]")?.addEventListener("click", () => {
      active?.onSubmit?.({ ...pendingSubmit, public_permission: false, status: "submitted" });
      remove();
    });
  }

  VoxiFeedbackUI.open = function (options = {}) {
    remove();
    active = options;
    const label = options.contextLabel ? `<p class="voxi-feedback-context">${escape(options.contextLabel)}</p>` : "";
    const overlay = document.createElement("div");
    overlay.id = "voxi-feedback-overlay";
    overlay.className = "voxi-feedback-overlay";
    overlay.innerHTML = `
      <div class="voxi-feedback-card" role="dialog" aria-modal="true" aria-labelledby="voxi-feedback-title">
        <div class="voxi-feedback-icon">&#9733;</div>
        <h3 id="voxi-feedback-title">How was this experience?</h3>
        ${label}
        <div class="voxi-feedback-stars" aria-label="Rating">${renderStars()}</div>
        <div class="voxi-feedback-hint">Please choose a rating first.</div>
        <textarea id="voxi-feedback-comment" class="voxi-feedback-comment" placeholder="Tell us what we can improve" maxlength="2000"></textarea>
        <div class="voxi-feedback-actions">
          <button type="button" class="voxi-feedback-primary" data-feedback-submit>Submit</button>
          <button type="button" class="voxi-feedback-secondary" data-feedback-skip>Maybe later</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    bindMain();
  };

  VoxiFeedbackUI.close = remove;
})();
