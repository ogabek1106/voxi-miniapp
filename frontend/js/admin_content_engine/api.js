window.AdminContentEngineApi = window.AdminContentEngineApi || {};

(function () {
  function adminId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
  }

  function base(path) {
    return `/admin/content-engine${path}`;
  }

  function withAdmin(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}telegram_id=${encodeURIComponent(adminId() || "")}`;
  }

  AdminContentEngineApi.health = function () {
    return apiGet(withAdmin(base("/health")));
  };

  AdminContentEngineApi.listResources = function () {
    return apiGet(withAdmin(base("/resources")));
  };

  AdminContentEngineApi.getResource = function (id) {
    return apiGet(withAdmin(base(`/resources/${Number(id)}`)));
  };

  AdminContentEngineApi.retryResource = function (id) {
    return apiPost(withAdmin(base(`/resources/${Number(id)}/retry`)), {});
  };

  AdminContentEngineApi.uploadResource = function ({ file, title, category, onProgress }) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || "");
      form.append("category", category || "");
      form.append("source_type", "api_upload");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", window.apiUrl(withAdmin(base("/resources/upload"))));
      xhr.withCredentials = true;

      xhr.upload.onprogress = function (event) {
        if (!event.lengthComputable || typeof onProgress !== "function") return;
        const percent = Math.max(0, Math.min(99, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      };

      xhr.onload = function () {
        const data = window.parseApiResponse(xhr.responseText || "");
        if (xhr.status >= 200 && xhr.status < 300) {
          if (typeof onProgress === "function") onProgress(100);
          resolve(data);
          return;
        }
        const error = new Error(typeof data === "string" ? data : JSON.stringify(data));
        error.status = xhr.status;
        error.data = data;
        reject(error);
      };

      xhr.onerror = function () {
        reject(new Error("Network error while uploading resource."));
      };

      xhr.send(form);
    });
  };
})();
