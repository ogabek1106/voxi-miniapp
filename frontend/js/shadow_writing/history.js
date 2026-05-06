window.ShadowWritingHistory = window.ShadowWritingHistory || {};

(function () {
  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function renderItem(item) {
    const essay = item?.essay || {};
    return `
      <div class="shadow-history-item">
        <div>
          <strong>${ShadowWritingUI.escape(essay.title || "Untitled Essay")}</strong>
          <span>${ShadowWritingUI.escape(essay.level || "-")} · ${ShadowWritingUI.escape(essay.theme || "-")}</span>
          <small>${formatDate(item.completed_at)}</small>
        </div>
        <div class="shadow-history-score">
          <b>${Number(item.accuracy || 0)}%</b>
          <span>${ShadowWritingResult.formatTime(item.time_seconds)} · ${Number(item.mistakes_count || 0)} mistakes</span>
        </div>
      </div>
    `;
  }

  ShadowWritingHistory.show = async function () {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.innerHTML = `<div class="shadow-writing-screen"><p class="shadow-muted">Loading history...</p></div>`;

    try {
      const data = await ShadowWritingApi.history();
      const items = Array.isArray(data?.history) ? data.history : [];
      screen.innerHTML = `
        <div class="shadow-writing-screen">
          <div class="shadow-writing-head">
            <h2>Shadow Writing History</h2>
            <p>Your previous rewriting practice</p>
          </div>
          <div class="shadow-history-list">
            ${items.length ? items.map(renderItem).join("") : `<div class="shadow-empty">No history yet.</div>`}
          </div>
          <button class="shadow-secondary-btn" onclick="ShadowWritingLoader.start()">Back</button>
        </div>
      `;
    } catch (error) {
      console.error("Shadow Writing history error:", error);
      screen.innerHTML = `
        <div class="shadow-writing-screen">
          <div class="shadow-empty">Could not load history.</div>
          <button class="shadow-secondary-btn" onclick="ShadowWritingLoader.start()">Back</button>
        </div>
      `;
    }
  };
})();
