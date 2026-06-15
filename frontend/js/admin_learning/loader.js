window.AdminLearningLoader = window.AdminLearningLoader || {};

(function () {
  const state = {
    view: "months",
    months: [],
    days: [],
    currentMonth: null,
    currentDay: null,
    editingBlock: null,
    previewDay: null,
    previewIndex: 0,
  };

  function host() {
    return document.getElementById("screen-mocks");
  }

  function render() {
    hideAllScreens();
    window.hideAnnouncement?.();
    const el = host();
    if (!el) return;
    el.style.display = "block";
    el.classList.add("admin-learning-host");
    let inner = "";
    if (state.view === "days") inner = AdminLearningDays.render(state);
    else if (state.view === "editor") inner = AdminLearningDayEditor.render(state);
    else if (state.view === "preview") inner = AdminLearningPreview.render(state);
    else inner = AdminLearningMonths.render(state);
    el.innerHTML = `<div class="admin-learning-page">${inner}</div>`;
    bind();
  }

  async function loadMonths() {
    const data = await AdminLearningApi.listMonths();
    state.months = data?.months || [];
  }

  async function loadDays(monthId) {
    const data = await AdminLearningApi.listDays(monthId);
    state.days = data?.days || [];
  }

  async function loadDay(dayId) {
    const data = await AdminLearningApi.getDay(dayId);
    state.currentDay = data?.day || null;
  }

  async function showMonths() {
    state.view = "months";
    state.currentMonth = null;
    state.currentDay = null;
    state.editingBlock = null;
    await loadMonths();
    render();
  }

  async function showDays(monthId) {
    state.currentMonth = AdminLearningMonths.find(state.months, monthId) || { id: Number(monthId) };
    state.view = "days";
    state.currentDay = null;
    state.editingBlock = null;
    await loadDays(monthId);
    render();
  }

  async function showEditor(dayId) {
    state.view = "editor";
    state.editingBlock = null;
    await loadDay(dayId);
    render();
  }

  async function refreshEditor() {
    await loadDay(state.currentDay.id);
    render();
  }

  function orderedBlockIds(blocks) {
    return [...(blocks || [])]
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id))
      .map((block) => Number(block.id));
  }

  function orderedGameBlockIds(blocks) {
    const gameTypes = new Set(["multiple_choice", "word_shuffle", "match_words", "odd_one_out", "fill_gap"]);
    return [...(blocks || [])]
      .filter((block) => gameTypes.has(block.block_type))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id))
      .map((block) => Number(block.id));
  }

  async function moveBlock(blockId, direction) {
    const gameIds = orderedGameBlockIds(state.currentDay?.blocks);
    const index = gameIds.indexOf(Number(blockId));
    if (index < 0) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= gameIds.length) return;
    const tmp = gameIds[index];
    gameIds[index] = gameIds[nextIndex];
    gameIds[nextIndex] = tmp;
    const sortedBlocks = [...(state.currentDay?.blocks || [])]
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id));
    const beforeGames = sortedBlocks
      .filter((block) => ["intro", "explanation", "vocabulary"].includes(block.block_type))
      .map((block) => Number(block.id));
    const completion = sortedBlocks
      .filter((block) => block.block_type === "completion")
      .map((block) => Number(block.id));
    const otherIds = sortedBlocks
      .map((block) => Number(block.id))
      .filter((id) => !beforeGames.includes(id) && !gameIds.includes(id) && !completion.includes(id));
    const ids = [...beforeGames, ...gameIds, ...completion, ...otherIds];
    await AdminLearningApi.reorderBlocks(state.currentDay.id, ids);
    await refreshEditor();
  }

  async function saveDayContent() {
    await AdminLearningApi.updateDay(state.currentDay.id, AdminLearningDayEditor.collectDay());
    const sectionBlocks = AdminLearningDayEditor.collectStructuredBlocks(state.currentDay);
    const games = AdminLearningDayEditor.collectGames();
    for (const block of [...sectionBlocks, ...games]) {
      if (block.id) await AdminLearningApi.updateBlock(block.id, block);
      else await AdminLearningApi.createBlock(state.currentDay.id, block);
    }
    await refreshEditor();
  }

  function bind() {
    document.querySelectorAll("[data-open-month]").forEach((button) => {
      button.addEventListener("click", () => showDays(button.dataset.openMonth));
    });

    document.querySelectorAll("[data-edit-month]").forEach((button) => {
      button.addEventListener("click", async () => {
        const payload = AdminLearningMonths.promptEdit(AdminLearningMonths.find(state.months, button.dataset.editMonth));
        if (!payload) return;
        await AdminLearningApi.updateMonth(button.dataset.editMonth, payload);
        await showMonths();
      });
    });

    document.querySelector("[data-learning-back-months]")?.addEventListener("click", showMonths);

    document.getElementById("admin-learning-day-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await AdminLearningApi.createDay(state.currentMonth.id, AdminLearningDays.collect());
      await showDays(state.currentMonth.id);
    });

    document.querySelectorAll("[data-open-day]").forEach((button) => {
      button.addEventListener("click", () => showEditor(button.dataset.openDay));
    });

    document.querySelectorAll("[data-delete-day]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this day and its blocks?")) return;
        await AdminLearningApi.deleteDay(button.dataset.deleteDay);
        await showDays(state.currentMonth.id);
      });
    });

    document.querySelector("[data-learning-back-days]")?.addEventListener("click", () => showDays(state.currentMonth.id));

    document.getElementById("admin-learning-day-content-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveDayContent();
      } catch (error) {
        console.error("Learning day save failed:", error);
        alert("Could not save day content.");
      }
    });

    document.querySelector("[data-add-learning-game]")?.addEventListener("click", async () => {
      const type = document.getElementById("learning-new-game-type")?.value || "multiple_choice";
      await AdminLearningApi.createBlock(state.currentDay.id, {
        block_type: type,
        sort_order: 40 + (state.currentDay?.blocks || []).length,
        content_json: {},
        is_required: false,
      });
      await refreshEditor();
    });

    document.querySelectorAll("[data-game-type-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const card = select.closest("[data-game-index]");
        const fields = card?.querySelector(".admin-learning-game-fields");
        const index = Number(card?.dataset?.gameIndex || 0);
        if (fields) fields.innerHTML = AdminLearningDayEditor.renderGameFields(select.value, index, {});
      });
    });

    document.querySelectorAll("[data-delete-block]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this block?")) return;
        await AdminLearningApi.deleteBlock(button.dataset.deleteBlock);
        await refreshEditor();
      });
    });

    document.querySelectorAll("[data-move-block]").forEach((button) => {
      button.addEventListener("click", () => moveBlock(button.dataset.moveBlock, button.dataset.direction));
    });

    document.querySelector("[data-learning-preview]")?.addEventListener("click", async (event) => {
      const data = await AdminLearningApi.previewDay(event.currentTarget.dataset.learningPreview);
      state.previewDay = data?.day || null;
      state.previewIndex = 0;
      state.view = "preview";
      render();
    });

    document.querySelector("[data-learning-back-editor]")?.addEventListener("click", () => {
      state.view = "editor";
      render();
    });

    document.querySelectorAll("[data-preview-step]").forEach((button) => {
      button.addEventListener("click", () => {
        state.previewIndex += button.dataset.previewStep === "next" ? 1 : -1;
        render();
      });
    });
  }

  AdminLearningLoader.show = async function () {
    if (!window.__isAdmin) {
      alert("Admin only.");
      return;
    }
    try {
      await showMonths();
    } catch (error) {
      console.error("Learning Plan admin load failed:", error);
      alert("Could not load Learning Plan.");
    }
  };
})();

window.showAdminLearningPlan = function () {
  AdminLearningLoader.show();
};
