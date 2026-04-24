window.UserWritingUI = window.UserWritingUI || {};

UserWritingUI.bindAnswerUpload = function (taskCard) {
  if (!taskCard) return;

  const uploadBtn = taskCard.querySelector(".writing-answer-upload-btn");
  const uploadInput = taskCard.querySelector(".writing-answer-upload-input");
  const wrap = taskCard.querySelector(".writing-answer-upload");
  const preview = taskCard.querySelector(".writing-answer-preview");
  if (!uploadBtn || !uploadInput || !wrap || !preview) return;

  uploadBtn.onclick = () => uploadInput.click();

  uploadInput.onchange = async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;

    uploadBtn.disabled = true;
    const original = uploadBtn.textContent;
    uploadBtn.textContent = "Uploading...";

    try {
      const uploaded = await UserWritingApi.uploadImage(file);
      wrap.dataset.imageUrl = uploaded.relativeUrl;
      preview.style.display = "block";
      preview.innerHTML = `
        <img
          src="${uploaded.fullUrl}"
          alt="Answer image"
          class="writing-zoomable-image"
          data-full-image-src="${uploaded.fullUrl}"
          onclick="UserWritingUI.openImageViewer(this.getAttribute('data-full-image-src'))"
        />
      `;
      UserWritingState.set({ autoSaveDirty: true });
    } catch (error) {
      console.error("Writing answer upload failed:", error);
      alert("Failed to upload image");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = original;
      uploadInput.value = "";
    }
  };
};
