window.AdminNotificationsUI = window.AdminNotificationsUI || {};

(function () {
  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  AdminNotificationsUI.render = function (items = []) {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.className = "container admin-notifications-host";
    screen.innerHTML = `
      <div class="admin-notifications-page">
        <div class="admin-notifications-head">
          <div>
            <h2>Notifications</h2>
            <p>Create lightweight app notifications with optional internal links.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>
        <form id="admin-notification-form" class="admin-notification-form">
          <label>Title<input name="title" required maxlength="120"></label>
          <label>Message<textarea name="message" rows="4" required></textarea></label>
          <label>Image<input name="image" type="file" accept="image/*"></label>
          <div class="admin-notification-grid">
            <label>Link type
              <select name="link_type">
                <option value="none">No link</option>
                <option value="internal">Internal section</option>
                <option value="external">External URL</option>
              </select>
            </label>
            <label>Link
              <input name="link_url" placeholder="odd-one-out or https://...">
            </label>
          </div>
          <button type="submit">Send notification</button>
        </form>
        <div class="admin-notification-library">
          <h3>Recent notifications</h3>
          ${items.length ? items.map((item) => `
            <div class="admin-notification-row">
              ${item.image_url ? `<img src="${escape(String(item.image_url).startsWith("http") ? item.image_url : `${window.API}${item.image_url}`)}" alt="">` : ""}
              <div>
                <strong>${escape(item.title)}</strong>
                <p>${escape(item.message)}</p>
                <span>${escape(item.link_type || "none")}${item.link_url ? ` · ${escape(item.link_url)}` : ""}</span>
              </div>
            </div>
          `).join("") : `<div class="admin-notification-empty">No notifications yet.</div>`}
        </div>
      </div>
    `;
  };
})();
