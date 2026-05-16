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

  function pretty(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function imageSrc(url) {
    if (!url) return "";
    return String(url).startsWith("http") ? String(url) : `${window.API}${url}`;
  }

  function categoryOptions() {
    const categories = window.AdminNotificationsConstants?.categories || ["custom_manual_notification"];
    return categories.map((category) => `<option value="${escape(category)}">${escape(pretty(category))}</option>`).join("");
  }

  function internalLinkOptions() {
    const links = window.AdminNotificationsConstants?.internalLinks || [];
    return links.map((link) => `<option value="${escape(link)}">${escape(pretty(link))}</option>`).join("");
  }

  function repeatOptions() {
    const intervals = window.AdminNotificationsConstants?.repeatIntervals || [24];
    return intervals.map((hours) => `<option value="${Number(hours)}">Every ${Number(hours)} hour${Number(hours) === 1 ? "" : "s"}</option>`).join("");
  }

  function scheduleLabel(item) {
    if (item.is_template && item.schedule_mode === "repeat") {
      return `Repeats ${item.repeat_interval_hours || "?"}h - next ${formatDate(item.next_send_at) || "not set"} - sent ${item.sent_count || 0}`;
    }
    if (item.is_template && item.schedule_mode === "scheduled") {
      return `Scheduled - ${formatDate(item.next_send_at || item.scheduled_at) || "not set"}`;
    }
    if (item.source_template_id) return `Delivered from schedule #${Number(item.source_template_id)}`;
    return "Sent now";
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
            <p>Create, schedule, repeat, update, and delete notifications.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>
        <form id="admin-notification-form" class="admin-notification-form">
          <div class="admin-notification-grid">
            <label>Category
              <select name="category">${categoryOptions()}</select>
            </label>
            <label>Delivery
              <select name="schedule_mode" id="admin-notification-mode">
                <option value="now">Send now</option>
                <option value="scheduled">Schedule once</option>
                <option value="repeat">Repeat</option>
              </select>
            </label>
          </div>
          <label>Title<input name="title" required maxlength="120"></label>
          <label>Message<textarea name="message" rows="4" required></textarea></label>
          <input name="existing_image_url" type="hidden">
          <div class="admin-notification-editing" id="admin-notification-editing" hidden>
            <span>Editing selected notification</span>
            <button type="button" id="admin-notification-new">Create new instead</button>
          </div>
          <label>Image<input name="image" type="file" accept="image/*"></label>
          <div class="admin-notification-grid">
            <label>Link type
              <select name="link_type" id="admin-notification-link-type">
                <option value="none">No link</option>
                <option value="internal">Internal section</option>
                <option value="external">External URL</option>
              </select>
            </label>
            <label class="admin-notification-link-manual">Link
              <input name="link_url" placeholder="odd-one-out or https://...">
            </label>
            <label class="admin-notification-link-preset" hidden>Internal link
              <select name="internal_link">
                <option value="">Choose section</option>
                ${internalLinkOptions()}
              </select>
            </label>
          </div>
          <div class="admin-notification-grid admin-notification-schedule-fields" hidden>
            <label>Send at
              <input name="scheduled_at" type="datetime-local">
            </label>
            <label>Repeat timer
              <select name="repeat_interval_hours">${repeatOptions()}</select>
            </label>
          </div>
          <div class="admin-notification-grid admin-notification-foundation-fields">
            <label>Cooldown ready
              <select name="cooldown_hours">
                <option value="">No cooldown yet</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </select>
            </label>
            <label>Max sends
              <input name="max_send_count" type="number" min="1" placeholder="Optional">
            </label>
          </div>
          <label class="admin-notification-toggle">
            <input name="is_enabled" type="checkbox" checked>
            Enabled
          </label>
          <button type="submit" id="admin-notification-submit">Create notification</button>
        </form>
        <div class="admin-notification-library">
          <h3>Recent notifications</h3>
          ${items.length ? items.map((item) => `
            <div class="admin-notification-row ${item.is_template ? "is-template" : ""}">
              ${item.image_url ? `<img src="${escape(imageSrc(item.image_url))}" alt="">` : ""}
              <div>
                <strong>${escape(item.title)}</strong>
                <p>${escape(item.message)}</p>
                <span>${escape(pretty(item.category || "custom_manual_notification"))} &middot; ${escape(scheduleLabel(item))}</span>
                <span>${escape(item.link_type || "none")}${item.link_url ? ` &middot; ${escape(item.link_url)}` : ""}</span>
                <span class="admin-notification-kind">${item.is_template ? "Schedule/Repeat rule" : "Sent notification"}</span>
              </div>
              <div class="admin-notification-actions">
                <button type="button" class="admin-notification-select" data-id="${Number(item.id)}">Manage</button>
                <button type="button" class="admin-notification-delete" data-id="${Number(item.id)}">Delete</button>
              </div>
            </div>
          `).join("") : `<div class="admin-notification-empty">No notifications yet.</div>`}
        </div>
      </div>
    `;
  };
})();
