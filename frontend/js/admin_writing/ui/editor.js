window.AdminWritingEditor = window.AdminWritingEditor || {};

AdminWritingEditor.render = function (payload = {}) {
  const screen = document.getElementById("screen-mocks");
  if (!screen) return;

  const test = payload.test || {};
  const tasks = Array.isArray(test.tasks) ? test.tasks : [];
  const task1 = tasks.find((t) => Number(t.task_number) === 1) || {};
  const task2 = tasks.find((t) => Number(t.task_number) === 2) || {};

  screen.style.display = "block";
  screen.innerHTML = `
    <h3>✍️ Writing Editor</h3>

    <div style="margin-top:12px; text-align:left;">
      <label>Writing name</label>
      <input id="writing-title" value="${AdminWritingUI.escapeHtml(test.title || "")}" placeholder="e.g. Cambridge Writing Test" />

      <label style="margin-top:8px; display:block;">Time limit (minutes)</label>
      <input id="writing-time" type="number" value="${Number(test.time_limit_minutes || 60)}" />
    </div>

    <hr style="margin:16px 0;" />

    <div id="writing-tasks-wrap" style="text-align:left;">
      ${AdminWritingUI.renderTaskCard(1, task1)}
      ${AdminWritingUI.renderTaskCard(2, task2)}
    </div>

    <hr style="margin:16px 0;" />

    <button id="btn-writing-save" type="button">💾 Save Draft</button>
    <button id="btn-writing-publish" type="button" style="margin-top:8px;">🚀 Publish</button>
    <button
      type="button"
      style="margin-top:8px;"
      onclick="openMockPack(${Number(AdminWritingState.get().currentPackId || 0)})"
    >
      ⬅ Back
    </button>
  `;

  const taskCards = Array.from(screen.querySelectorAll(".writing-task-card"));
  taskCards.forEach((card) => {
    AdminWritingUI.bindTaskUpload(card);
    AdminWritingUI.bindInstructionPicker(card);
  });

  const saveBtn = document.getElementById("btn-writing-save");
  const publishBtn = document.getElementById("btn-writing-publish");

  if (saveBtn) {
    saveBtn.onclick = async () => {
      await AdminWritingEditor.save("draft", saveBtn);
    };
  }

  if (publishBtn) {
    publishBtn.onclick = async () => {
      await AdminWritingEditor.save("published", publishBtn);
    };
  }
};

AdminWritingEditor.collectPayload = function (status = "draft") {
  const state = AdminWritingState.get();
  const testId = Number(state.currentTestId || 0) || null;
  const fallbackPackId = Number(window.__currentPackId || 0) || null;
  const packId = Number(state.currentPackId || fallbackPackId || 0) || null;
  const rawTitle = String(document.getElementById("writing-title")?.value || "").trim();
  const title = rawTitle || (packId ? `Writing Pack ${packId}` : "Untitled Writing");
  const timeLimit = Math.max(1, Number(document.getElementById("writing-time")?.value || 60));

  const taskCards = Array.from(document.querySelectorAll(".writing-task-card"));
  const tasks = taskCards.map((card) => {
    const taskNumber = Number(card.dataset.taskNumber || 0);
    return AdminWritingUI.readTaskData(card, taskNumber);
  });

  return {
    id: testId,
    title,
    time_limit_minutes: timeLimit,
    status,
    mock_pack_id: packId,
    tasks
  };
};

AdminWritingEditor.save = async function (status = "draft", button = null) {
  const original = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = status === "published" ? "Publishing..." : "Saving...";
  }

  try {
    const payload = AdminWritingEditor.collectPayload(status);

    const saved = await AdminWritingApi.save(payload);
    const testId = Number(saved?.id || 0);
    if (testId) {
      AdminWritingState.set({ currentTestId: testId });
    }

    if (status === "published" && testId) {
      await AdminWritingApi.publish(testId);
      alert("🚀 Writing published");
    } else {
      alert("✅ Writing saved");
    }
  } catch (error) {
    console.error("Writing save error:", error);
    alert("Failed to save writing");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original || "Save";
    }
  }
};
