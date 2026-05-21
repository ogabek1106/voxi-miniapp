window.AdminPremiereSubscriptionsLoader = window.AdminPremiereSubscriptionsLoader || {};

(function () {
  let selectedUser = null;
  let searchTimer = null;

  function bindSearchResultClicks(users) {
    document.querySelectorAll("[data-premiere-user-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.premiereUserId);
        selectedUser = (users || []).find((user) => Number(user.id) === id) || null;
        AdminPremiereSubscriptionsUI.renderSelectedUser(selectedUser);
        bindGrantButton();
      });
    });
  }

  function bindGrantButton() {
    document.querySelector("[data-grant-premiere-access]")?.addEventListener("click", async (event) => {
      if (!selectedUser) return;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await AdminPremiereSubscriptionsApi.grant(selectedUser.id);
        selectedUser = result?.user || selectedUser;
        AdminPremiereSubscriptionsUI.renderSelectedUser(selectedUser, result);
        bindGrantButton();
      } catch (error) {
        console.error("Premiere access grant failed:", error);
        button.disabled = false;
        const detail = error?.data?.detail || error?.message || "";
        const message = String(detail).includes("active_premiere_not_found")
          ? "No active Premiere mock found. Enable a Premiere mock first."
          : "Could not grant Premiere access. Try again.";
        AdminPremiereSubscriptionsUI.renderGrantError(message);
      }
    });
  }

  function bind() {
    const searchInput = document.getElementById("admin-premiere-user-search");
    searchInput?.addEventListener("input", () => {
      const query = String(searchInput.value || "").trim();
      window.clearTimeout(searchTimer);
      if (query.length < 2) {
        AdminPremiereSubscriptionsUI.renderSearchResults([], "Type at least 2 characters to search.");
        return;
      }
      AdminPremiereSubscriptionsUI.renderSearchResults([], "Searching...");
      searchTimer = window.setTimeout(async () => {
        try {
          const data = await AdminPremiereSubscriptionsApi.searchUsers(query);
          const users = data?.items || [];
          AdminPremiereSubscriptionsUI.renderSearchResults(users);
          bindSearchResultClicks(users);
        } catch (error) {
          console.error("Premiere user search failed:", error);
          AdminPremiereSubscriptionsUI.renderSearchResults([], "Search failed. Try again.");
        }
      }, 250);
    });
  }

  AdminPremiereSubscriptionsLoader.show = function () {
    selectedUser = null;
    hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    AdminPremiereSubscriptionsUI.render();
    bind();
  };
})();

window.showAdminPremiereSubscriptions = function () {
  AdminPremiereSubscriptionsLoader.show();
};
