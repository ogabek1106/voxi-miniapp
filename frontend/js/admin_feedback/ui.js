window.AdminFeedbackUI = window.AdminFeedbackUI || {};

(function () {
  AdminFeedbackUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function screen() {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const host = document.getElementById("screen-mocks");
    if (host) host.style.display = "block";
    return host;
  }

  AdminFeedbackUI.renderLoading = function () {
    const host = screen();
    if (!host) return;
    host.innerHTML = `
      <div class="admin-feedback-screen">
        <div class="admin-feedback-head">
          <div>
            <h2>Feedback Ratings</h2>
            <p>Loading user ratings...</p>
          </div>
          <button class="admin-feedback-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  AdminFeedbackUI.render = function () {
    const host = screen();
    if (!host) return;
    const items = AdminFeedbackState.get().items || [];
    const submitted = items.filter((item) => item.status === "submitted");
    const average = submitted.length
      ? submitted.reduce((sum, item) => sum + Number(item.rating || 0), 0) / submitted.length
      : 0;
    host.innerHTML = `
      <div class="admin-feedback-screen">
        <div class="admin-feedback-head">
          <div>
            <h2>Feedback Ratings</h2>
            <p>Stars, reviews, public permission, and timestamps.</p>
          </div>
          <button class="admin-feedback-back" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-feedback-summary">
          <article><span>Total rows</span><strong>${items.length}</strong></article>
          <article><span>Submitted</span><strong>${submitted.length}</strong></article>
          <article><span>Average stars</span><strong>${average ? average.toFixed(1) : "0.0"}</strong></article>
        </div>
        ${AdminFeedbackTable.render(items)}
      </div>
    `;
  };

  AdminFeedbackUI.renderError = function (message) {
    const host = screen();
    if (!host) return;
    host.innerHTML = `
      <div class="admin-feedback-screen">
        <div class="admin-feedback-empty">
          <strong>Could not load feedback ratings.</strong>
          <span>${AdminFeedbackUI.escape(message || "Please try again.")}</span>
          <button class="admin-feedback-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };
})();
