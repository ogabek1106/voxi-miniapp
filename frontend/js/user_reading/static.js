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
    <div class="reading-user-shell" style="
      display:flex;
      flex-direction:column;
      height:100%;
      position:relative;
    ">

      <!-- HEADER -->
      ${UserReading.renderHeader()}

      <!-- DYNAMIC CONTENT -->
      <div id="reading-user-content" style="
        flex:1;
        overflow-y:auto;
        padding:0 12px;
        box-sizing:border-box;
      "></div>

      <button
        type="button"
        onclick="UserReading.goBack()"
        aria-label="Back"
        style="
          position:absolute;
          left:10px;
          bottom:10px;
          width:32px;
          height:32px;
          border:0;
          border-radius:50%;
          background:#f4f4f6;
          color:#111;
          font-size:16px;
          font-weight:700;
          line-height:1;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 3px 10px rgba(0,0,0,0.12);
          cursor:pointer;
          z-index:120;
        "
      ><-</button>

    </div>
  `;
};

UserReading.goBack = function () {
  if (typeof window.showMocksScreen === "function") {
    window.showMocksScreen();
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  if (typeof window.goHome === "function") {
    window.goHome();
  }
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
