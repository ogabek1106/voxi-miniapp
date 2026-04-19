// frontend/js/user_reading/static.js

window.UserListening = window.UserListening || {};

UserListening.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

UserListening.renderShell = function (container) {
  if (!container) return;

  container.innerHTML = `
    <div class="reading-user-shell" style="
      display:flex;
      flex-direction:column;
      height:100%;
    ">

      <!-- HEADER -->
      ${UserListening.renderHeader()}

      <!-- DYNAMIC CONTENT -->
     <div id="reading-user-content" style="
  flex:1;
  overflow-y:auto;
  padding:0 12px 70px 12px;
  box-sizing:border-box;
"></div>

    </div>
  `;
};

UserListening.renderLoading = function (container) {
  UserListening.renderShell(container);

  const content = document.getElementById("reading-user-content");
  if (content) {
    content.innerHTML = `<h3 style="margin-top:6px;">Loading Listening...</h3>`;
  }
};

UserListening.renderError = function (container, error) {
  UserListening.renderShell(container);

  const content = document.getElementById("reading-user-content");
  if (content) {
    content.innerHTML = `
      <h3>Listening load failed</h3>
      <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">
${UserListening.escapeHtml(error?.message || error || "Unknown error")}
      </pre>
    `;
  }
};
