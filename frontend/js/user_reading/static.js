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
