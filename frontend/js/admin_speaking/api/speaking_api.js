window.AdminSpeakingApi = window.AdminSpeakingApi || {};

AdminSpeakingApi.loadByPack = async function (packId) {
  const response = await fetch(`${window.API}/admin/mock-packs/${packId}/speaking`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to load speaking for mock pack");
  }
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
};

AdminSpeakingApi.loadById = async function (testId) {
  return await apiGet(`/admin/speaking/tests/${testId}`);
};

AdminSpeakingApi.save = async function (payload) {
  return await apiPost("/admin/speaking/tests", payload);
};

AdminSpeakingApi.publish = async function (testId) {
  return await apiPost(`/admin/speaking/tests/${testId}/publish`, {});
};

AdminSpeakingApi.delete = async function (testId) {
  return await apiDelete(`/admin/speaking/tests/${testId}`);
};
