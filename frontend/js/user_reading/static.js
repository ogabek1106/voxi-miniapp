// frontend/js/user_reading/static.js
window.UserReading = window.UserReading || {};

UserReading.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

UserReading.renderShell = function (container) {
  if (!container) return;

  container.innerHTML = `
    <div class="reading-user-shell" style="display:flex; flex-direction:column; gap:12px;">
      <div class="reading-static-layer" style="
        position:sticky;
        top:0;
        z-index:10;
        background:var(--bg-color, #fff);
        border-bottom:1px solid var(--border-color, #e5e5ea);
        padding:10px 8px;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <button type="button" onclick="showMockList()" style="width:auto; padding:8px 10px;">
            Back
          </button>
          <div style="font-weight:700;">Reading</div>
          <div id="reading-user-timer" style="font-weight:700;">--:--</div>
        </div>
        <div id="reading-user-title" style="font-size:13px; opacity:0.7; margin-top:6px;"></div>
      </div>

      <div class="reading-dynamic-layer">
        <div id="reading-user-content"></div>
      </div>
    </div>
  `;
};

UserReading.renderLoading = function (container) {
  UserReading.renderShell(container);

  const content = document.getElementById("reading-user-content");
  if (content) {
    content.innerHTML = `<h3 style="margin-top:6px;">Loading Reading...</h3>`;
  }
};

UserReading.renderError = function (container, error) {
  UserReading.renderShell(container);

  const content = document.getElementById("reading-user-content");
  if (content) {
    content.innerHTML = `
      <h3>Reading load failed</h3>
      <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">
${UserReading.escapeHtml(error?.message || error || "Unknown error")}
      </pre>
    `;
  }
};
