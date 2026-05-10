window.AdminWordMergeForm = window.AdminWordMergeForm || {};

(function () {
  const LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
  const TARGETS = [8, 16, 32, 64, 128, 256, 512];

  function option(value, selected, label) {
    return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label || value || "Not set"}</option>`;
  }

  function defaultStages() {
    return [
      { english_word: "small", uzbek_meaning: "kichkina" },
      { english_word: "tiny", uzbek_meaning: "juda kichik" },
      { english_word: "compact", uzbek_meaning: "ixcham" },
    ];
  }

  function mergeValues(target) {
    const values = [];
    let current = 2;
    while (current < Number(target || 128)) {
      values.push(current);
      current *= 2;
    }
    return values;
  }

  function previewLadder(stages, target) {
    const values = mergeValues(target);
    const cleanStages = stages.filter((stage) => stage.english_word && stage.uzbek_meaning);
    if (!cleanStages.length) return values.map((value) => ({ value, english_word: "", uzbek_meaning: "" }));
    const lastIndex = Math.max(0, cleanStages.length - 1);
    const usableSlots = Math.max(1, values.length - 1);
    return values.map((value, index) => {
      let stageIndex = Math.round(index * lastIndex / usableSlots);
      if (index === values.length - 1 && values.length > cleanStages.length) stageIndex = lastIndex;
      return { value, ...cleanStages[Math.min(stageIndex, lastIndex)] };
    });
  }

  function collectStagesFromDom() {
    return Array.from(document.querySelectorAll(".admin-word-merge-stage-row")).map((row) => ({
      english_word: row.querySelector(".word-merge-stage-en")?.value.trim() || "",
      uzbek_meaning: row.querySelector(".word-merge-stage-uz")?.value.trim() || "",
    }));
  }

  function renderStageRows(stages) {
    return stages.map((stage, index) => `
      <div class="admin-word-merge-stage-row">
        <span>${index + 1}</span>
        <input class="word-merge-stage-en" value="${AdminWordMergeUI.escape(stage.english_word || "")}" placeholder="English word">
        <input class="word-merge-stage-uz" value="${AdminWordMergeUI.escape(stage.uzbek_meaning || "")}" placeholder="Uzbek meaning">
        <button type="button" class="admin-word-merge-danger" onclick="AdminWordMergeForm.removeStage(this)">Remove</button>
      </div>
    `).join("");
  }

  AdminWordMergeForm.render = function () {
    const host = document.getElementById("admin-word-merge-form-host");
    if (!host) return;
    const editing = AdminWordMergeState.getEditing();
    const stages = editing?.stages?.length ? editing.stages : defaultStages();
    host.innerHTML = `
      <form id="admin-word-merge-form" class="admin-word-merge-card">
        <h3>${editing ? "Edit word family" : "Create word family"}</h3>
        <div id="admin-word-merge-message" class="admin-word-merge-message" hidden></div>

        <label>Family title</label>
        <input id="word-merge-title" value="${AdminWordMergeUI.escape(editing?.title || "")}" placeholder="Size, Quality, Emotion" required>

        <div class="admin-word-merge-two">
          <div>
            <label>CEFR level</label>
            <select id="word-merge-level">${LEVELS.map((value) => option(value, editing?.cefr_level || "")).join("")}</select>
          </div>
          <div>
            <label>Mastery target</label>
            <select id="word-merge-target">${TARGETS.map((value) => option(value, editing?.mastery_target || 128, `x${value}`)).join("")}</select>
          </div>
        </div>

        <label>Category</label>
        <input id="word-merge-category" value="${AdminWordMergeUI.escape(editing?.category || "")}" placeholder="General, IELTS, Emotion">

        <div class="admin-word-merge-stage-head">
          <label>Vocabulary stages</label>
          <button type="button" class="admin-word-merge-secondary" onclick="AdminWordMergeForm.addStage()">Add stage</button>
        </div>
        <div id="admin-word-merge-stages" class="admin-word-merge-stages">
          ${renderStageRows(stages)}
        </div>

        <div class="admin-word-merge-preview">
          <strong>Merge ladder preview</strong>
          <div id="admin-word-merge-ladder"></div>
        </div>

        <div class="admin-word-merge-actions">
          <button class="admin-word-merge-primary" type="submit">${editing ? "Save changes" : "Save family"}</button>
          ${editing ? `<button class="admin-word-merge-secondary" type="button" onclick="AdminWordMergeForm.newFamily()">New</button>` : ""}
        </div>
      </form>
    `;
    document.getElementById("admin-word-merge-form")?.addEventListener("submit", AdminWordMergeForm.submit);
    document.getElementById("admin-word-merge-stages")?.addEventListener("input", AdminWordMergeForm.renderPreview);
    document.getElementById("word-merge-target")?.addEventListener("change", AdminWordMergeForm.renderPreview);
    AdminWordMergeForm.renderPreview();
  };

  AdminWordMergeForm.addStage = function () {
    const host = document.getElementById("admin-word-merge-stages");
    if (!host) return;
    const stages = collectStagesFromDom();
    stages.push({ english_word: "", uzbek_meaning: "" });
    host.innerHTML = renderStageRows(stages);
    AdminWordMergeForm.renderPreview();
  };

  AdminWordMergeForm.removeStage = function (button) {
    const stages = collectStagesFromDom();
    const row = button.closest(".admin-word-merge-stage-row");
    const index = Array.from(document.querySelectorAll(".admin-word-merge-stage-row")).indexOf(row);
    stages.splice(index, 1);
    document.getElementById("admin-word-merge-stages").innerHTML = renderStageRows(stages.length ? stages : defaultStages());
    AdminWordMergeForm.renderPreview();
  };

  AdminWordMergeForm.renderPreview = function () {
    const host = document.getElementById("admin-word-merge-ladder");
    if (!host) return;
    const target = Number(document.getElementById("word-merge-target")?.value || 128);
    const ladder = previewLadder(collectStagesFromDom(), target);
    host.innerHTML = `
      ${ladder.map((item) => `
        <div class="admin-word-merge-ladder-row">
          <span>x${item.value}</span>
          <strong>${AdminWordMergeUI.escape(item.english_word || "-")}</strong>
          <em>${AdminWordMergeUI.escape(item.uzbek_meaning || "")}</em>
        </div>
      `).join("")}
      <div class="admin-word-merge-ladder-row is-mastered">
        <span>x${target}</span>
        <strong>MASTERED</strong>
        <em>tile disappears with reward</em>
      </div>
    `;
  };

  AdminWordMergeForm.collect = function () {
    return {
      title: document.getElementById("word-merge-title")?.value.trim() || "",
      cefr_level: document.getElementById("word-merge-level")?.value || null,
      category: document.getElementById("word-merge-category")?.value.trim() || null,
      mastery_target: Number(document.getElementById("word-merge-target")?.value || 128),
      status: AdminWordMergeState.getEditing()?.status || "inactive",
      stages: collectStagesFromDom().filter((stage) => stage.english_word && stage.uzbek_meaning),
    };
  };

  AdminWordMergeForm.submit = async function (event) {
    event.preventDefault();
    const payload = AdminWordMergeForm.collect();
    if (!payload.title || payload.stages.length < 2) {
      AdminWordMergeUI.renderMessage("Add a title and at least 2 complete stages.", "error");
      return;
    }
    try {
      const editing = AdminWordMergeState.getEditing();
      if (editing) {
        await AdminWordMergeApi.update(editing.id, payload);
      } else {
        await AdminWordMergeApi.create(payload);
      }
      AdminWordMergeUI.renderMessage("Word family saved.", "success");
      AdminWordMergeState.setEditing(null);
      await AdminWordMergeLoader.loadList();
      AdminWordMergeForm.render();
    } catch (error) {
      console.error("Word Merge save error:", error);
      AdminWordMergeUI.renderMessage("Could not save this word family.", "error");
    }
  };

  AdminWordMergeForm.newFamily = function () {
    AdminWordMergeState.setEditing(null);
    AdminWordMergeForm.render();
  };
})();
