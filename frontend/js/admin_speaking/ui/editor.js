window.AdminSpeakingEditor = window.AdminSpeakingEditor || {};

AdminSpeakingEditor.render = function (payload = {}) {
  const screen = document.getElementById("screen-mocks");
  if (!screen) return;

  const test = payload.test || {};
  const parts = Array.isArray(test.parts) ? test.parts : [];
  const part1 = parts.find((part) => Number(part.part_number) === 1) || {};
  const part2 = parts.find((part) => Number(part.part_number) === 2) || {};
  const part3 = parts.find((part) => Number(part.part_number) === 3) || {};

  screen.style.display = "block";
  screen.innerHTML = `
    <h3>🗣 Speaking Editor</h3>

    <div style="margin-top:12px; text-align:left;">
      <label>Speaking name</label>
      <input id="speaking-title" value="${AdminSpeakingUI.escapeHtml(test.title || "")}" placeholder="e.g. Cambridge Speaking Test" />

      <label style="margin-top:8px; display:block;">Time limit (minutes)</label>
      <input id="speaking-time" type="number" value="${Number(test.time_limit_minutes || 18)}" />
    </div>

    <hr style="margin:16px 0;" />

    <div id="speaking-parts-wrap" style="text-align:left;">
      ${AdminSpeakingUI.renderPartCard(1, part1)}
      ${AdminSpeakingUI.renderPartCard(2, part2)}
      ${AdminSpeakingUI.renderPartCard(3, part3)}
    </div>

    <hr style="margin:16px 0;" />

    <button id="btn-speaking-save" type="button">💾 Save Draft</button>
    <button id="btn-speaking-publish" type="button" style="margin-top:8px;">🚀 Publish</button>
    <button
      type="button"
      style="margin-top:8px;"
      onclick="openMockPack(${Number(AdminSpeakingState.get().currentPackId || 0)})"
    >
      ⬅ Back
    </button>
  `;

  const saveBtn = document.getElementById("btn-speaking-save");
  const publishBtn = document.getElementById("btn-speaking-publish");

  if (saveBtn) {
    saveBtn.onclick = async () => {
      await AdminSpeakingEditor.save("draft", saveBtn);
    };
  }

  if (publishBtn) {
    publishBtn.onclick = async () => {
      await AdminSpeakingEditor.save("published", publishBtn);
    };
  }
};

AdminSpeakingEditor.collectPayload = function (status = "draft") {
  const state = AdminSpeakingState.get();
  const testId = Number(state.currentTestId || 0) || null;
  const fallbackPackId = Number(window.__currentPackId || 0) || null;
  const packId = Number(state.currentPackId || fallbackPackId || 0) || null;
  const rawTitle = String(document.getElementById("speaking-title")?.value || "").trim();
  const title = rawTitle || (packId ? `Speaking Pack ${packId}` : "Untitled Speaking");
  const timeLimit = Math.max(1, Number(document.getElementById("speaking-time")?.value || 18));

  const partCards = Array.from(document.querySelectorAll(".speaking-part-card"));
  const parts = partCards.map((card) => {
    const partNumber = Number(card.dataset.partNumber || 0);
    return AdminSpeakingUI.readPartData(card, partNumber);
  });

  return {
    id: testId,
    title,
    time_limit_minutes: timeLimit,
    status,
    mock_pack_id: packId,
    parts
  };
};

AdminSpeakingEditor.save = async function (status = "draft", button = null) {
  const original = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = status === "published" ? "Publishing..." : "Saving...";
  }

  try {
    const payload = AdminSpeakingEditor.collectPayload(status);

    const saved = await AdminSpeakingApi.save(payload);
    const testId = Number(saved?.id || 0);
    if (testId) {
      AdminSpeakingState.set({ currentTestId: testId });
    }

    if (status === "published" && testId) {
      await AdminSpeakingApi.publish(testId);
      alert("🚀 Speaking published");
    } else {
      alert("✅ Speaking saved");
    }
  } catch (error) {
    console.error("Speaking save error:", error);
    alert("Failed to save speaking");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original || "Save";
    }
  }
};
