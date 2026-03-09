// frontend/js/admin_reading/loader/editor_loader.js
window.AdminReading = window.AdminReading || {};
window.showAdminReadingList = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>📖 Reading Section (Admin)</h3>

    <h4 style="margin-top:12px;">Published tests</h4>
    <div id="admin-reading-published">
      <p style="opacity:0.6;">Loading…</p>
    </div>

    <h4 style="margin-top:16px;">Drafts</h4>
    <div id="admin-reading-drafts">
      <p style="opacity:0.6;">Loading…</p>
    </div>

    <button style="margin-top:16px;" onclick="showCreateReading()">➕ Create New Reading</button>

    <button style="margin-top:12px;" onclick="showAdminMock()">⬅ Back</button>
  `;
  setTimeout(loadAdminReadingList, 0);
};

window.loadAdminReadingList = async function () {
  try {
    const tests = await apiGet("/admin/reading/tests");

    const publishedWrap = document.getElementById("admin-reading-published");
    const draftsWrap = document.getElementById("admin-reading-drafts");

    if (!publishedWrap || !draftsWrap) return;

    const published = tests.filter(t => t.status === "published");
    const drafts = tests.filter(t => t.status === "draft");

    publishedWrap.innerHTML = published.length
      ? published.map(t => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <button onclick="openAdminReading(${t.id})">
              📖 #${t.id} — ${t.title}
            </button>
            <button
              onclick="deleteReadingTest(${t.id})"
              style="
                background:#fee2e2;
                color:#b91c1c;
                width:36px;            /* slim width */
                height:36px;           /* same height as main buttons */
                min-width:36px;
                border-radius:8px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex:0 0 auto;         /* never stretch */
              "
              title="Delete"
            >
              🗑
            </button>
          </div>
        `).join("")
      : `<p style="opacity:0.6;">No published tests yet</p>`;

    draftsWrap.innerHTML = drafts.length
      ? drafts.map(t => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <button onclick="openAdminReading(${t.id})">
              ✏️ #${t.id} — ${t.title}
            </button>
            <button
              onclick="deleteReadingTest(${t.id})"
              style="
                background:#fee2e2;
                color:#b91c1c;
                width:36px;            /* slim width */
                height:36px;           /* same height as main buttons */
                min-width:36px;
                border-radius:8px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex:0 0 auto;         /* never stretch */
              "
              title="Delete"
            >
              🗑
            </button>
          </div>
        `).join("")
      : `<p style="opacity:0.6;">No drafts yet</p>`;

  } catch (e) {
    console.error(e);
    alert("Failed to load reading tests");
  }
};
