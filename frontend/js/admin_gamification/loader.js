window.AdminGamificationLoader = window.AdminGamificationLoader || {};

(function () {
  const state = {
    tab: "badges",
    badges: [],
    rewards: [],
    editingBadge: null,
    editingReward: null,
  };

  async function load() {
    const [badges, rewards] = await Promise.all([
      AdminGamificationApi.listBadges(),
      AdminGamificationApi.listRewards(),
    ]);
    state.badges = badges?.badges || [];
    state.rewards = rewards?.rewards || [];
  }

  function bind() {
    document.querySelectorAll("[data-gamification-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.tab = button.dataset.gamificationTab;
        state.editingBadge = null;
        state.editingReward = null;
        AdminGamificationUI.render(state);
        bind();
      });
    });

    document.getElementById("admin-gamification-badge-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = AdminGamificationUI.collectBadge();
      try {
        await AdminGamificationApi.saveBadge(payload);
        state.editingBadge = null;
        await load();
        AdminGamificationUI.render(state);
        bind();
      } catch (error) {
        console.error("Gamification badge save failed:", error);
        alert("Could not save badge.");
      }
    });

    document.getElementById("gamification-badge-upload")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const data = await AdminGamificationApi.uploadIcon(file);
        const input = document.getElementById("gamification-badge-icon");
        if (input) input.value = data?.url || "";
      } catch (error) {
        console.error("Badge icon upload failed:", error);
        alert("Upload PNG/WebP up to 1MB.");
      }
    });

    document.getElementById("admin-gamification-reward-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = AdminGamificationUI.collectReward();
      if (!payload) return;
      try {
        await AdminGamificationApi.saveReward(payload);
        state.editingReward = null;
        await load();
        AdminGamificationUI.render(state);
        bind();
      } catch (error) {
        console.error("Gamification reward save failed:", error);
        alert("Could not save reward.");
      }
    });

    document.querySelectorAll("[data-edit-badge]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingBadge = AdminGamificationUI.findBadge(state.badges, button.dataset.editBadge);
        state.tab = "badges";
        AdminGamificationUI.render(state);
        bind();
      });
    });

    document.querySelectorAll("[data-delete-badge]").forEach((button) => {
      button.addEventListener("click", async () => {
        await AdminGamificationApi.deactivateBadge(button.dataset.deleteBadge);
        await load();
        AdminGamificationUI.render(state);
        bind();
      });
    });

    document.querySelectorAll("[data-edit-reward]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingReward = AdminGamificationUI.findReward(state.rewards, button.dataset.editReward);
        state.tab = "rewards";
        AdminGamificationUI.render(state);
        bind();
      });
    });

    document.querySelectorAll("[data-delete-reward]").forEach((button) => {
      button.addEventListener("click", async () => {
        await AdminGamificationApi.deactivateReward(button.dataset.deleteReward);
        await load();
        AdminGamificationUI.render(state);
        bind();
      });
    });
  }

  AdminGamificationLoader.show = async function () {
    state.editingBadge = null;
    state.editingReward = null;
    AdminGamificationUI.render(state);
    try {
      await load();
      AdminGamificationUI.render(state);
      bind();
    } catch (error) {
      console.error("Gamification admin load failed:", error);
      alert("Could not load gamification tools.");
    }
  };
})();

window.showAdminGamification = function () {
  AdminGamificationLoader.show();
};
