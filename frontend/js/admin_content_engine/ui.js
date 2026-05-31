window.AdminContentEngineUI = window.AdminContentEngineUI || {};

(function () {
  const CATEGORIES = [
    "Vocabulary",
    "Grammar",
    "IELTS Writing",
    "IELTS Speaking",
    "IELTS Reading",
    "IELTS Listening",
    "General English",
    "Resource"
  ];

  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.resources)) return data.resources;
    return [];
  }

  function statusClass(status) {
    const clean = String(status || "uploaded").toLowerCase();
    if (clean === "ready") return "is-ready";
    if (clean === "failed") return "is-failed";
    if (clean === "processing") return "is-processing";
    return "is-uploaded";
  }

  function errorMessage(error) {
    const detail = error?.data?.detail || error?.data || error?.message || error;
    if (typeof detail === "string") return detail;
    if (detail?.error) return detail.error;
    if (detail?.detail) return typeof detail.detail === "string" ? detail.detail : JSON.stringify(detail.detail);
    return "Request failed.";
  }

  function renderRows(resources) {
    if (!resources.length) {
      return `<div class="admin-content-empty">No resources uploaded yet.</div>`;
    }
    return `
      <div class="admin-content-table-scroll">
        <table class="admin-content-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>File</th>
              <th>Category</th>
              <th>Source</th>
              <th>Status</th>
              <th>Ideas</th>
              <th>Processed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${resources.map((item) => `
              <tr>
                <td>#${Number(item.id || 0)}</td>
                <td>${escape(item.title || "-")}</td>
                <td>${escape(item.file_name || "-")}</td>
                <td>${escape(item.category || "-")}</td>
                <td>${escape(item.source_type || "-")}</td>
                <td><span class="admin-content-status ${statusClass(item.status)}">${escape(item.status || "uploaded")}</span></td>
                <td>${Number(item.idea_count || 0)}</td>
                <td>${formatDate(item.processed_at)}</td>
                <td>
                  ${String(item.status || "").toLowerCase() === "failed"
                    ? `<button type="button" class="admin-content-row-btn" data-retry-resource="${Number(item.id || 0)}">Retry</button>`
                    : ""}
                </td>
              </tr>
              ${item.processing_error ? `
                <tr class="admin-content-error-row">
                  <td></td>
                  <td colspan="8">${escape(item.processing_error)}</td>
                </tr>
              ` : ""}
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  AdminContentEngineUI.render = function ({ resources = [], uploadStatus = "", uploadProgress = 0, listStatus = "" } = {}) {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    const normalized = normalizeList(resources);
    screen.className = "container admin-content-engine-host";
    screen.innerHTML = `
      <div class="admin-content-page">
        <div class="admin-content-head">
          <div>
            <h2>Voxi Content Engine</h2>
            <p>Upload large source books and track idea-card processing in the bot content engine.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>

        <section class="admin-content-card">
          <h3>Upload Resource</h3>
          <form id="admin-content-upload-form" class="admin-content-form">
            <label>File
              <input id="admin-content-file" name="file" type="file" accept=".pdf,.txt,.docx,.md,.csv" required>
            </label>
            <label>Title
              <input name="title" type="text" placeholder="Cambridge Vocabulary for IELTS">
            </label>
            <label>Category
              <select name="category">
                ${CATEGORIES.map((category) => `<option value="${escape(category)}">${escape(category)}</option>`).join("")}
              </select>
            </label>
            <button type="submit">Upload</button>
          </form>
          <div class="admin-content-progress" aria-label="Upload progress">
            <span style="width:${Number(uploadProgress || 0)}%"></span>
          </div>
          <div class="admin-content-upload-status">${escape(uploadStatus || "Waiting for a file.")}</div>
        </section>

        <section class="admin-content-card">
          <div class="admin-content-resources-head">
            <h3>Resources</h3>
            <button type="button" id="admin-content-refresh">Refresh</button>
          </div>
          ${listStatus ? `<div class="admin-content-list-status">${escape(listStatus)}</div>` : ""}
          ${renderRows(normalized)}
        </section>
      </div>
    `;
  };

  AdminContentEngineUI.errorMessage = errorMessage;
  AdminContentEngineUI.normalizeList = normalizeList;
})();
