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

  async function moveBlock(blockId, direction) {
    const ids = orderedBlockIds(state.currentDay?.blocks);
    const index = ids.indexOf(Number(blockId));
    if (index < 0) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= ids.length) return;
    const tmp = ids[index];
    ids[index] = ids[nextIndex];
    ids[nextIndex] = tmp;
    await AdminLearningApi.reorderBlocks(state.currentDay.id, ids);
    await refreshEditor();
  }

  function bind() {
    document.getElementById("admin-learning-month-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await AdminLearningApi.createMonth(AdminLearningMonths.collect());
        await showMonths();
      } catch (error) {
        console.error("Learning month save failed:", error);
        alert("Could not save month.");
      }
    });

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

    document.querySelectorAll("[data-delete-month]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this month and its days?")) return;
        await AdminLearningApi.deleteMonth(button.dataset.deleteMonth);
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

    document.getElementById("admin-learning-day-info-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await AdminLearningApi.updateDay(state.currentDay.id, AdminLearningDayEditor.collect());
      await refreshEditor();
    });

    document.getElementById("learning-block-type")?.addEventListener("change", AdminLearningBlockEditor.renderFieldsForSelectedType);

    document.getElementById("admin-learning-block-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = AdminLearningBlockEditor.collect();
      if (payload.id) await AdminLearningApi.updateBlock(payload.id, payload);
      else await AdminLearningApi.createBlock(state.currentDay.id, payload);
      state.editingBlock = null;
      await refreshEditor();
    });

    document.querySelector("[data-cancel-block-edit]")?.addEventListener("click", () => {
      state.editingBlock = null;
      render();
    });

    document.querySelectorAll("[data-edit-block]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingBlock = AdminLearningBlockEditor.find(state.currentDay?.blocks, button.dataset.editBlock);
        render();
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
