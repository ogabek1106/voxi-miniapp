window.AdminWritingApi = window.AdminWritingApi || {};

AdminWritingApi.uploadImageFile = async function (file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${window.API}/admin/upload-image`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  const relativeUrl = String(data?.url || "").trim();
  if (!relativeUrl) {
    throw new Error("Upload API returned empty url");
  }

  const normalized = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return {
    relativeUrl: normalized,
    fullUrl: `${window.API}${normalized}`
  };
};

AdminWritingApi.loadByPack = async function (packId) {
  try {
    return await apiGet(`/admin/mock-packs/${packId}/writing`);
  } catch (error) {
    return null;
  }
};

AdminWritingApi.loadById = async function (testId) {
  return await apiGet(`/admin/writing/tests/${testId}`);
};

AdminWritingApi.save = async function (payload) {
  return await apiPost("/admin/writing/tests", payload);
};

AdminWritingApi.publish = async function (testId) {
  return await apiPost(`/admin/writing/tests/${testId}/publish`, {});
};

AdminWritingApi.delete = async function (testId) {
  return await apiDelete(`/admin/writing/tests/${testId}`);
};
