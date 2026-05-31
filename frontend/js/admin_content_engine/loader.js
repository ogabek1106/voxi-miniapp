window.AdminContentEngineLoader = window.AdminContentEngineLoader || {};

(function () {
  let resources = [];
  let uploadStatus = "Waiting for a file.";
  let uploadProgress = 0;
  let listStatus = "";
  let pollTimer = null;
  let isLoading = false;

  function hasActiveResources() {
    return resources.some((item) => {
      const status = String(item?.status || "").toLowerCase();
      return status === "uploaded" || status === "processing";
    });
  }

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function schedulePolling() {
    stopPolling();
    if (!hasActiveResources()) return;
    pollTimer = setTimeout(() => {
      loadResources({ quiet: true });
    }, 7000);
  }

  function render() {
    AdminContentEngineUI.render({
      resources,
      uploadStatus,
      uploadProgress,
      listStatus,
    });
    bindEvents();
  }

  function setListError(error) {
    const message = AdminContentEngineUI.errorMessage(error);
    listStatus = message === "content_engine_api_not_configured"
      ? "Content Engine API is not configured."
      : message;
  }

  async function loadResources({ quiet = false } = {}) {
    if (isLoading) return;
    isLoading = true;
    if (!quiet) {
      listStatus = "Loading resources...";
      render();
    }

    try {
      const data = await AdminContentEngineApi.listResources();
      resources = AdminContentEngineUI.normalizeList(data);
      listStatus = "";
    } catch (error) {
      console.error("Content Engine resources failed:", error);
      setListError(error);
    } finally {
      isLoading = false;
      render();
      schedulePolling();
    }
  }

  async function retryResource(resourceId) {
    listStatus = `Retrying resource #${resourceId}...`;
    render();
    try {
      await AdminContentEngineApi.retryResource(resourceId);
      listStatus = "Retry started.";
      await loadResources({ quiet: true });
    } catch (error) {
      console.error("Content Engine retry failed:", error);
      setListError(error);
      render();
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.querySelector('input[name="file"]')?.files?.[0];
    if (!file) {
      uploadStatus = "Choose a file first.";
      uploadProgress = 0;
      render();
      return;
    }

    const title = form.querySelector('input[name="title"]')?.value || "";
    const category = form.querySelector('select[name="category"]')?.value || "";
    uploadStatus = "Uploading...";
    uploadProgress = 0;
    render();

    try {
      await AdminContentEngineApi.uploadResource({
        file,
        title,
        category,
        onProgress: (percent) => {
          uploadProgress = percent;
          uploadStatus = percent >= 100 ? "Uploaded. Processing in background." : `Uploading ${percent}%...`;
          render();
        },
      });
      uploadProgress = 100;
      uploadStatus = "Uploaded. Processing in background.";
      form.reset();
      await loadResources({ quiet: true });
    } catch (error) {
      console.error("Content Engine upload failed:", error);
      const message = AdminContentEngineUI.errorMessage(error);
      uploadStatus = message === "content_engine_api_not_configured"
        ? "Content Engine API is not configured."
        : message;
      uploadProgress = 0;
      render();
    }
  }

  function bindEvents() {
    const form = document.getElementById("admin-content-upload-form");
    if (form) form.addEventListener("submit", handleUpload);

    const refresh = document.getElementById("admin-content-refresh");
    if (refresh) refresh.addEventListener("click", () => loadResources());

    document.querySelectorAll("[data-retry-resource]").forEach((button) => {
      button.addEventListener("click", () => retryResource(Number(button.dataset.retryResource || 0)));
    });
  }

  AdminContentEngineLoader.show = async function () {
    window.hideAllScreens?.();

    const announcement = document.getElementById("announcement");
    if (announcement) announcement.style.display = "none";
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) bottomNav.style.display = "none";

    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";

    uploadStatus = "Waiting for a file.";
    uploadProgress = 0;
    listStatus = "Loading resources...";
    render();
    await loadResources({ quiet: true });
  };

  AdminContentEngineLoader.stop = function () {
    stopPolling();
  };

  window.showAdminContentEngine = function () {
    AdminContentEngineLoader.show();
  };
})();
