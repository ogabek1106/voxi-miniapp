window.AdminLiveDashboardUI = window.AdminLiveDashboardUI || {};

(function () {
  AdminLiveDashboardUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function formatTime(seconds) {
    const total = Math.max(0, Number(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  AdminLiveDashboardUI.formatTime = formatTime;

  AdminLiveDashboardUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.add("admin-live-host");
      screen.style.display = "block";
    }
    return screen;
  };

  AdminLiveDashboardUI.renderLoading = function () {
    const screen = AdminLiveDashboardUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-live-screen">
        <div class="admin-live-head">
          <h2>Live Dashboard</h2>
          <p>Loading active sessions...</p>
        </div>
      </div>
    `;
  };

  AdminLiveDashboardUI.render = function () {
    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.classList.add("admin-live-host");
    const previousTableScroll = screen.querySelector(".admin-live-table-scroll");
    const previousTableScrollLeft = previousTableScroll?.scrollLeft || 0;
    const previousTableScrollTop = previousTableScroll?.scrollTop || 0;
    const data = AdminLiveDashboardState.get();
    screen.innerHTML = `
      <div class="admin-live-screen">
        <div class="admin-live-head">
          <div>
            <h2>Live Dashboard</h2>
            <p>Operational activity, sessions, and feature usage. Refreshes automatically.</p>
          </div>
          <button class="admin-live-back" onclick="showAdminPanel()">Back</button>
        </div>

        <section class="admin-live-section">
          <h3>Live Now</h3>
          <div class="admin-live-grid admin-live-grid--live">
            ${statCard("Online users", data.live_now.online_users, "live")}
            ${statCard("Mini App users", data.live_now.active_miniapp_users)}
            ${statCard("Gameplay users", data.live_now.active_gameplay_users)}
            ${statCard("Reading users", data.live_now.active_reading_users)}
            ${statCard("Listening users", data.live_now.active_listening_users)}
          </div>
        </section>

        <section class="admin-live-section">
          <h3>All-Time Stats</h3>
          <div class="admin-live-grid">
            ${statCard("Unique visitors", data.all_time.total_unique_visitors)}
            ${statCard("Registered users", data.all_time.total_registered_users)}
            ${statCard("Sessions opened", data.all_time.total_sessions_opened)}
            ${statCard("Games played", data.all_time.total_games_played)}
            ${statCard("Reading started", data.all_time.total_reading_tests_started)}
            ${statCard("Reading submitted", data.all_time.total_reading_submissions)}
          </div>
        </section>

        <section class="admin-live-section">
          <h3>Today</h3>
          <div class="admin-live-grid">
            ${statCard("Visitors today", data.today.visitors_today)}
            ${statCard("New users today", data.today.new_users_today)}
            ${statCard("Returning today", data.today.returning_users_today)}
            ${statCard("Games today", data.today.games_played_today)}
            ${statCard("Tests started", data.today.tests_started_today)}
            ${statCard("Avg session", formatTime(data.today.average_session_duration_today))}
          </div>
        </section>

        <section class="admin-live-section admin-live-two-col">
          <div>
            <h3>Feature Usage</h3>
            ${renderFeatureUsage(data.feature_usage)}
          </div>
          <div>
            <h3>Live User Table</h3>
            ${AdminLiveDashboardTable.render(data.users)}
          </div>
        </section>
      </div>
    `;
    const tableScroll = screen.querySelector(".admin-live-table-scroll");
    if (tableScroll) {
      tableScroll.scrollLeft = previousTableScrollLeft;
      tableScroll.scrollTop = previousTableScrollTop;
    }
  };

  AdminLiveDashboardUI.renderError = function (message) {
    const screen = AdminLiveDashboardUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-live-screen">
        <div class="admin-live-empty">
          <strong>Could not load Live Dashboard.</strong>
          <span>${AdminLiveDashboardUI.escape(message || "Please try again.")}</span>
          <button class="admin-live-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  function statCard(label, value, tone = "") {
    return `
      <article class="admin-live-card ${tone ? `admin-live-card--${tone}` : ""}">
        <span>${AdminLiveDashboardUI.escape(label)}</span>
        <strong>${AdminLiveDashboardUI.escape(value ?? 0)}</strong>
      </article>
    `;
  }

  function renderFeatureUsage(items = []) {
    if (!items.length) {
      return `<div class="admin-live-empty"><strong>No feature usage yet.</strong><span>Counts appear when users move through the app.</span></div>`;
    }
    return `
      <div class="admin-live-feature-list">
        ${items.map((item) => `
          <article>
            <span>${AdminLiveDashboardUI.escape(item.feature)}</span>
            <strong>${Number(item.total || 0)}</strong>
            <em>Today: ${Number(item.today || 0)}</em>
          </article>
        `).join("")}
      </div>
    `;
  }
})();
