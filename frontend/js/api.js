// frontend/js/api.js
window.API_BASE = "https://api.ebaiacademy.com";
window.API = window.API_BASE;

window.apiUrl = function (path) {
  const cleanBase = String(window.API_BASE || "").replace(/\/+$/, "");
  const cleanPath = String(path || "").startsWith("/") ? String(path || "") : `/${path || ""}`;
  return `${cleanBase}${cleanPath}`;
};

window.parseApiResponse = function (text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
};

window.apiRequest = async function (path, options = {}) {
  const url = window.apiUrl(path);
  let res;
  let text = "";

  try {
    res = await fetch(url, options);
    text = await res.text();
  } catch (error) {
    console.log("[API] request failed", {
      url,
      method: options.method || "GET",
      message: error?.message || String(error)
    });
    throw error;
  }

  const data = window.parseApiResponse(text);
  if (!res.ok) {
    console.log("[API] bad response", {
      url,
      method: options.method || "GET",
      status: res.status,
      data
    });
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }

  return data;
};

window.apiGet = async function (path) {
  return window.apiRequest(path);
};

window.apiPost = async function (path, body) {
  return window.apiRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

window.apiPut = async function (path, body) {
  return window.apiRequest(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

window.apiDelete = async function (path) {
  return window.apiRequest(path, {
    method: "DELETE",
  });
};
