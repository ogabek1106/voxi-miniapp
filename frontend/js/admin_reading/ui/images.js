// frontend/js/admin_reading/ui/images.js
window.AdminReading = window.AdminReading || {};

AdminReading.uploadImageFile = async function (file) {
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
