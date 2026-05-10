window.AdminWordMergeStats = window.AdminWordMergeStats || {};

(function () {
  AdminWordMergeStats.show = async function () {
    const screen = AdminWordMergeUI.screen();
    if (!screen) return;
    screen.innerHTML = `<div class="admin-word-merge-screen"><div class="admin-word-merge-empty">Loading Word Merge stats...</div></div>`;
    try {
      const data = await AdminWordMergeApi.stats();
      const summary = data?.summary || {};
      const items = Array.isArray(data?.items) ? data.items : [];
      screen.innerHTML = `
        <div class="admin-word-merge-screen">
          <div class="admin-word-merge-head">
            <div>
              <h2>Word Merge Stats</h2>
              <p>Early analytics shell for future leaderboard and daily challenge work.</p>
            </div>
            <button class="admin-word-merge-secondary" onclick="showAdminWordMerge()">Back</button>
          </div>
          <div class="admin-word-merge-summary">
            <div><span>Total sessions</span><strong>${Number(summary.total_sessions || 0)}</strong></div>
            <div><span>Recent mastered</span><strong>${Number(summary.recent_mastered || 0)}</strong></div>
            <div><span>Best recent score</span><strong>${Number(summary.best_recent_score || 0)}</strong></div>
          </div>
          <div class="admin-word-merge-card">
            <h3>Recent sessions</h3>
            <div class="admin-word-merge-table-wrap">
              <table class="admin-word-merge-table">
                <thead><tr><th>ID</th><th>Telegram</th><th>Score</th><th>Mastered</th><th>Moves</th><th>Status</th><th>Started</th></tr></thead>
                <tbody>
                  ${items.map((item) => `
                    <tr>
                      <td>${Number(item.id)}</td>
                      <td>${AdminWordMergeUI.escape(item.telegram_id || "-")}</td>
                      <td>${Number(item.score || 0)}</td>
                      <td>${Number(item.mastered_count || 0)}</td>
                      <td>${Number(item.moves_count || 0)}</td>
                      <td>${AdminWordMergeUI.escape(item.status || "-")}</td>
                      <td>${AdminWordMergeUI.escape(item.started_at || "-")}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Word Merge stats error:", error);
      screen.innerHTML = `<div class="admin-word-merge-screen"><div class="admin-word-merge-empty">Could not load stats.</div><button onclick="showAdminWordMerge()">Back</button></div>`;
    }
  };
})();
