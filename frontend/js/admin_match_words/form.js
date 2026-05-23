window.AdminMatchWordsForm = window.AdminMatchWordsForm || {};

(function () {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

  function option(value, selected) {
    return `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
  }

  AdminMatchWordsForm.render = function () {
    const host = document.getElementById("admin-match-words-form-host");
    if (!host) return;
    const editing = AdminMatchWordsState.getEditing();
    host.innerHTML = `
      <form id="admin-match-words-form" class="admin-match-words-card">
        <h3>${editing ? "Edit pair" : "Add pair"}</h3>
        <div id="admin-match-words-message" class="admin-match-words-message" hidden></div>
        <label>
          English text
          <input id="match-words-english" value="${AdminMatchWordsUI.escape(editing?.english_text || "")}" placeholder="take responsibility" required>
        </label>
        <label>
          Uzbek translation
          <input id="match-words-translation" value="${AdminMatchWordsUI.escape(editing?.translation_text || "")}" placeholder="mas'uliyatni o'z zimmasiga olmoq" required>
        </label>
        <div class="admin-match-words-two">
          <label>
            Level
            <select id="match-words-level">${levels.map((level) => option(level, editing?.level || "B1")).join("")}</select>
          </label>
          <label>
            Theme
            <input id="match-words-theme" value="${AdminMatchWordsUI.escape(editing?.theme || "")}" placeholder="IELTS, Work">
          </label>
        </div>
        <label class="admin-match-words-check">
          Active
          <input id="match-words-active" type="checkbox" ${editing?.is_active ? "checked" : ""}>
        </label>
        <div class="admin-match-words-actions">
          <button class="admin-match-words-primary" type="submit">${editing ? "Save changes" : "Save pair"}</button>
          ${editing ? `<button class="admin-match-words-secondary" type="button" onclick="AdminMatchWordsForm.newEntry()">New</button>` : ""}
        </div>
      </form>
    `;
    document.getElementById("admin-match-words-form")?.addEventListener("submit", AdminMatchWordsForm.submit);
  };

  AdminMatchWordsForm.collect = function () {
    return {
      english_text: document.getElementById("match-words-english")?.value?.trim() || "",
      translation_text: document.getElementById("match-words-translation")?.value?.trim() || "",
      level: document.getElementById("match-words-level")?.value || "B1",
      theme: document.getElementById("match-words-theme")?.value?.trim() || null,
      is_active: Boolean(document.getElementById("match-words-active")?.checked),
    };
  };

  AdminMatchWordsForm.submit = async function (event) {
    event.preventDefault();
    const payload = AdminMatchWordsForm.collect();
    if (!payload.english_text || !payload.translation_text) {
      AdminMatchWordsUI.renderMessage("Add English text and Uzbek translation.", "error");
      return;
    }
    try {
      const editing = AdminMatchWordsState.getEditing();
      if (editing) await AdminMatchWordsApi.update(editing.id, payload);
      else await AdminMatchWordsApi.create(payload);
      AdminMatchWordsState.setEditing(null);
      AdminMatchWordsUI.renderMessage("Pair saved.", "success");
      await AdminMatchWordsLoader.loadList();
      AdminMatchWordsForm.render();
    } catch (error) {
      console.error("Match Words save error:", error);
      AdminMatchWordsUI.renderMessage("Could not save this pair.", "error");
    }
  };

  AdminMatchWordsForm.newEntry = function () {
    AdminMatchWordsState.setEditing(null);
    AdminMatchWordsForm.render();
  };
})();
