// frontend/js/admin_reading_stats.js

(() => {
  const originalShowAdminPanel = window.showAdminPanel;
  window.showAdminPanel = function () {
    if (typeof originalShowAdminPanel === "function") {
      originalShowAdminPanel();
    }

    const screen = document.getElementById("screen-mocks");
    if (!screen) return;

    const existing = screen.querySelector('button[onclick="showAdminReadingStats()"]');
    if (existing) return;

    const dbButton = screen.querySelector('button[onclick="showDbStats()"]');
    if (!dbButton) return;

    const btn = document.createElement("button");
    btn.setAttribute("onclick", "showAdminReadingStats()");
    btn.textContent = "Reading Stats";
    dbButton.insertAdjacentElement("afterend", btn);
  };
})();

window.showAdminReadingStats = async function () {
  const parseApiDate = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const hasTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(raw);
    const normalized = hasTimezone ? raw : `${raw}Z`;
    const dt = new Date(normalized);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  const formatApiDate = (value) => {
    const dt = parseApiDate(value);
    return dt ? dt.toLocaleString() : "—";
  };

  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) {
    alert("Open inside Telegram");
    return;
  }

  if (typeof hideAllScreens === "function") hideAllScreens();
  if (typeof hideAnnouncement === "function") hideAnnouncement();
  if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;

  screen.style.display = "block";
  screen.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%;">
      <h3 style="margin:0 0 10px 0;">Reading Stats</h3>
      <div style="opacity:0.7; font-size:13px; margin-bottom:8px;">Loading...</div>
      <button style="margin-top:12px;" onclick="showAdminPanel()">Back</button>
    </div>
  `;

  try {
    const data = await apiGet(`/__admin/reading-stats?telegram_id=${telegramId}`);
    const rows = (data?.items || []).map((item) => {
      const startedAt = formatApiDate(item.started_at);
      const finishedAt = formatApiDate(item.finished_at);
      const finishType = item.finish_type || "—";
      const score = item.score || "—";
      const band = item.band == null ? "—" : Number(item.band).toFixed(1);
      const name = item.name || "—";
      const telegramIdText = item.telegram_id ?? "—";
      const title = item.reading_title || "—";

      return `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${telegramIdText}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${name}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${title}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${startedAt}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${finishedAt}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap; text-transform:capitalize;">${finishType}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${score}</td>
          <td style="padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">${band}</td>
        </tr>
      `;
    }).join("");

    screen.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <h3 style="margin:0 0 6px 0;">Reading Stats</h3>
        <p style="margin:0 0 8px 0; opacity:0.8; font-size:13px;">Total rows: <b>${data?.total || 0}</b></p>

        <div style="
          flex:1;
          min-height:260px;
          overflow:auto;
          border:1px solid #e5e5ea;
          border-radius:8px;
          background:var(--card-bg);
          text-align:left;
        ">
          <table style="
            border-collapse:collapse;
            min-width:1100px;
            width:max-content;
            font-size:13px;
          ">
            <thead>
              <tr>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">User's telegram ID</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Name</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Reading</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Started at</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Finished at</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Finish type</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Score</th>
                <th style="position:sticky; top:0; background:var(--card-bg); padding:8px; border-bottom:1px solid #e5e5ea; white-space:nowrap;">Band</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `
                <tr>
                  <td colspan="8" style="padding:12px; opacity:0.75;">No reading stats yet.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <button style="margin-top:12px;" onclick="showAdminPanel()">Back</button>
      </div>
    `;
  } catch (error) {
    console.error(error);
    screen.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <h3 style="margin:0;">Reading Stats</h3>
        <p style="margin:0; color:#dc2626;">${String(error?.message || "Failed to load reading stats.")}</p>
        <button onclick="showAdminPanel()">Back</button>
      </div>
    `;
  }
};

