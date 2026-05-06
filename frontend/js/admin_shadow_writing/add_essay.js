window.AdminShadowWritingAdd = window.AdminShadowWritingAdd || {};

(function () {
  AdminShadowWritingAdd.show = function () {
    const screen = AdminShadowWritingUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-shadow-screen">
        <div class="admin-shadow-head">
          <h2>Add New Essay</h2>
          <p>Save one essay for Shadow Writing practice.</p>
        </div>

        <form id="admin-shadow-add-form" class="admin-shadow-form">
          <label>Essay name/title</label>
          <input id="shadow-essay-title" placeholder="Optional title" />

          <label>Essay level/band</label>
          <input id="shadow-essay-level" placeholder="e.g. Band 7" required />

          <label>Essay theme/topic</label>
          <input id="shadow-essay-theme" placeholder="e.g. Education" required />

          <label>Essay text</label>
          <textarea id="shadow-essay-text" placeholder="Paste essay text..." required></textarea>

          <button class="admin-shadow-primary" type="submit">Add</button>
          <button class="admin-shadow-secondary" type="button" onclick="showAdminShadowWriting()">Back</button>
        </form>
      </div>
    `;

    document.getElementById("admin-shadow-add-form")?.addEventListener("submit", AdminShadowWritingAdd.submit);
  };

  AdminShadowWritingAdd.submit = async function (event) {
    event.preventDefault();
    const title = document.getElementById("shadow-essay-title")?.value.trim() || "";
    const level = document.getElementById("shadow-essay-level")?.value.trim() || "";
    const theme = document.getElementById("shadow-essay-theme")?.value.trim() || "";
    const text = document.getElementById("shadow-essay-text")?.value.trim() || "";

    if (!level || !theme || !text) {
      alert("Level, theme, and essay text are required.");
      return;
    }

    try {
      await AdminShadowWritingApi.createEssay({ title, level, theme, text });
      alert("Essay added");
      AdminShadowWritingLibrary.show();
    } catch (error) {
      console.error("Add Shadow Writing essay error:", error);
      alert("Failed to add essay");
    }
  };
})();
