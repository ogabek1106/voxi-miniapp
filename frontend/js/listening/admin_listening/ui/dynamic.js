// frontend/js/listening/admin_listening/ui/dynamic.js
window.AdminListeningDynamic = window.AdminListeningDynamic || {};

(function () {
  let mountNode = null;

  function rerender() {
    if (!mountNode) return;
    AdminListeningState.sync();
    AdminListeningStatic.renderShell(mountNode);
    AdminListeningTestForm.bind(rerender);

    const addSectionBtn = document.getElementById("listening-add-section-btn");
    const removeSectionBtn = document.getElementById("listening-remove-section-btn");
    if (addSectionBtn) {
      addSectionBtn.onclick = () => {
        AdminListeningState.addSection();
        rerender();
      };
    }
    if (removeSectionBtn) {
      removeSectionBtn.onclick = () => {
        AdminListeningState.removeLastSection();
        rerender();
      };
    }

    const sectionsRoot = document.getElementById("listening-sections-root");
    AdminListeningSections.render(sectionsRoot, rerender);
  }

  AdminListeningDynamic.mount = function (container) {
    mountNode = container;
    rerender();
  };

  AdminListeningDynamic.rerender = function () {
    rerender();
  };
})();

