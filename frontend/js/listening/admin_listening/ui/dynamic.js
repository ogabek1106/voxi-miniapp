// frontend/js/listening/admin_listening/ui/dynamic.js
window.AdminListeningDynamic = window.AdminListeningDynamic || {};

(function () {
  let mountNode = null;
  let currentPackId = null;
  const softChange = function () {
    // Keep state updates in memory without full rerender.
    // Full rerender on each keystroke causes focus loss and scroll jump.
  };

  function rerender() {
    if (!mountNode) return;
    AdminListeningState.sync();
    AdminListeningStatic.renderShell(mountNode);
    AdminListeningTestForm.bind(softChange);

    const statusEl = document.getElementById("listening-save-status");
    const saveBtn = document.getElementById("listening-save-btn");
    const reloadBtn = document.getElementById("listening-reload-btn");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        if (!currentPackId) {
          if (statusEl) statusEl.textContent = "Mock pack ID is missing.";
          return;
        }
        if (statusEl) statusEl.textContent = "Saving...";
        saveBtn.disabled = true;
        try {
          const state = AdminListeningState.get();
          await AdminListeningApi.saveDraft(currentPackId, state);
          if (statusEl) statusEl.textContent = "Saved.";
        } catch (error) {
          console.error(error);
          if (statusEl) statusEl.textContent = `Save failed: ${error?.message || "error"}`;
        } finally {
          saveBtn.disabled = false;
        }
      };
    }
    if (reloadBtn) {
      reloadBtn.onclick = async () => {
        if (!currentPackId) return;
        if (statusEl) statusEl.textContent = "Loading...";
        reloadBtn.disabled = true;
        try {
          const loaded = await AdminListeningApi.loadDraft(currentPackId);
          AdminListeningState.setState(loaded);
          if (statusEl) statusEl.textContent = "Loaded.";
          rerender();
        } catch (error) {
          console.error(error);
          if (statusEl) statusEl.textContent = `Load failed: ${error?.message || "error"}`;
        } finally {
          reloadBtn.disabled = false;
        }
      };
    }

    const addSectionBtn = document.getElementById("listening-add-section-btn");
    if (addSectionBtn) {
      addSectionBtn.onclick = () => {
        AdminListeningState.addSection();
        rerender();
      };
    }

    const sectionsRoot = document.getElementById("listening-sections-root");
    AdminListeningSections.render(sectionsRoot, {
      onChange: softChange,
      onRebuild: rerender
    });
  }

  AdminListeningDynamic.mount = function (container, options = {}) {
    mountNode = container;
    currentPackId = Number(options.packId || 0) || null;
    rerender();
  };

  AdminListeningDynamic.rerender = function () {
    rerender();
  };
})();
