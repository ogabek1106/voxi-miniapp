// frontend/js/profile/ui/last_activity.js

window.ProfileUI = window.ProfileUI || {};

ProfileUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

ProfileUI.renderLastActivity = function (activity) {
  if (!activity) {
    return `
      <div style="
        width:100%;
        max-width:100%;
margin:0;
padding:16px 10px;
        box-sizing:border-box;
        background:var(--card-bg);
        border:none;
        box-shadow:0 2px 8px rgba(0,0,0,0.12);
        border-radius:16px;
        padding:16px 14px;
        text-align:left;
      ">
        <div style="
          font-size:16px;
          font-weight:600;
          margin-bottom:12px;
          text-align:center;
        ">
          Last Activity
        </div>

        <div style="
          font-size:13px;
          opacity:0.7;
          text-align:center;
          padding:10px 0 4px 0;
        ">
          No reading activity yet.
        </div>
      </div>
    `;
  }

  const readingTitle = ProfileUI.escapeHtml(activity.reading_title || "");
  const score = ProfileUI.escapeHtml(activity.score || "");
  const band = ProfileUI.escapeHtml(activity.band || "");

  return `
    <div style="
      width:100%;
      max-width:100%;
margin:0;
padding:16px 10px;
      box-sizing:border-box;
      background:var(--card-bg);
      border:none;
      box-shadow:0 2px 8px rgba(0,0,0,0.12);
      border-radius:16px;
      padding:16px 14px;
      text-align:left;
    ">
      <div style="
        font-size:16px;
        font-weight:600;
        margin-bottom:12px;
        text-align:center;
      ">
        Last Activity
      </div>

      <div style="
        width:100%;
        overflow-x:auto;
        overflow-y:auto;
      ">
        <table style="
          width:100%;
          min-width:260px;
          border-collapse:collapse;
          font-size:13px;
        ">
          <thead>
            <tr>
              <th style="
                text-align:left;
                padding:8px 6px;
                border-bottom:1px solid var(--border-color);
                font-weight:600;
                white-space:nowrap;
              ">IELTS Reading</th>
              <th style="
                text-align:left;
                padding:8px 6px;
                border-bottom:1px solid var(--border-color);
                font-weight:600;
                white-space:nowrap;
              ">Score</th>
              <th style="
                text-align:left;
                padding:8px 6px;
                border-bottom:1px solid var(--border-color);
                font-weight:600;
                white-space:nowrap;
              ">Band</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style="
                padding:10px 6px;
                border-bottom:1px solid rgba(255,255,255,0.06);
                vertical-align:top;
                min-width:140px;
              ">${readingTitle || "&nbsp;"}</td>

              <td style="
                padding:10px 6px;
                border-bottom:1px solid rgba(255,255,255,0.06);
                vertical-align:top;
                white-space:nowrap;
              ">${score || "&nbsp;"}</td>

              <td style="
                padding:10px 6px;
                border-bottom:1px solid rgba(255,255,255,0.06);
                vertical-align:top;
                white-space:nowrap;
              ">${band || "&nbsp;"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};
