window.AdminShadowWritingLibrary = window.AdminShadowWritingLibrary || {};

(function () {
  function preview(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > 140 ? `${clean.slice(0, 140)}...` : clean;
  }

  function renderEssay(essay) {
    return `
      <div class="admin-shadow-essay-card">
        <div>
          <h3>${AdminShadowWritingUI.escape(essay.title || "Untitled Essay")}</h3>
          <p class="admin-shadow-meta">${AdminShadowWritingUI.escape(essay.level)} · ${AdminShadowWritingUI.escape(essay.theme)}</p>
          <p class="admin-shadow-preview">${AdminShadowWritingUI.escape(preview(essay.text))}</p>
        </div>
        <button class="admin-shadow-delete" onclick="AdminShadowWritingLibrary.remove(${Number(essay.id)})">Delete</button>
      </div>
    `;
  }

  AdminShadowWritingLibrary.show = async function () {
    const screen = AdminShadowWritingUI.screen();
    if (!screen) return;
    screen.innerHTML = `<div class="admin-shadow-screen"><p class="admin-shadow-muted">Loading essays...</p></div>`;

    try {
      const data = await AdminShadowWritingApi.listEssays();
      const essays = Array.isArray(data?.essays) ? data.essays : [];
      screen.innerHTML = `
        <div class="admin-shadow-screen">
          <div class="admin-shadow-head">
            <h2>Essay Library</h2>
            <p>${essays.length} essay${essays.length === 1 ? "" : "s"} saved</p>
          </div>
          <div class="admin-shadow-library">
            ${essays.length ? essays.map(renderEssay).join("") : `<div class="admin-shadow-empty">No essays yet.</div>`}
          </div>
          <button class="admin-shadow-primary" onclick="AdminShadowWritingAdd.show()">Add New Essay</button>
          <button class="admin-shadow-secondary" onclick="showAdminShadowWriting()">Back</button>
        </div>
      `;
    } catch (error) {
      console.error("Shadow Writing library error:", error);
      screen.innerHTML = `
        <div class="admin-shadow-screen">
          <div class="admin-shadow-empty">Could not load essays.</div>
          <button class="admin-shadow-secondary" onclick="showAdminShadowWriting()">Back</button>
        </div>
      `;
    }
  };

  AdminShadowWritingLibrary.remove = async function (essayId) {
    if (!confirm("Delete this essay?")) return;
    try {
      await AdminShadowWritingApi.deleteEssay(essayId);
      await AdminShadowWritingLibrary.show();
    } catch (error) {
      console.error("Delete Shadow Writing essay error:", error);
      alert("Failed to delete essay");
    }
  };
})();
