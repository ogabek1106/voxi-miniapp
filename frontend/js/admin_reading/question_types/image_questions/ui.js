// frontend/js/admin_reading/question_types/image_questions/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("image_questions", function (container, data = null) {
  container.innerHTML = `
    <div class="image-questions-editor">
      <label>Upload an image</label>
      <div class="image-questions-upload-wrap" style="margin-top:6px;" data-image-url="">
        <button type="button" class="image-questions-upload-btn">Upload image</button>
        <input type="file" accept="image/*" class="image-questions-file" style="display:none;" />
        <div class="image-questions-preview" style="margin-top:8px;"></div>
      </div>

      <div class="image-questions-rows" style="margin-top:12px;"></div>

      <div style="margin-top:12px; display:flex; gap:8px;">
        <button type="button" class="image-questions-add">Add question</button>
        <button type="button" class="image-questions-remove">Remove last</button>
      </div>
    </div>
  `;

  const block = container.closest(".question-block");
  const header = block?.querySelector(".q-header");
  if (header) header.style.display = "none";

  const typeSelect = block?.querySelector(".q-type-select");
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value !== "image_questions" && header) {
        header.style.display = "block";
      }
    }, { once: true });
  }

  const rowsWrap = container.querySelector(".image-questions-rows");
  const addBtn = container.querySelector(".image-questions-add");
  const removeBtn = container.querySelector(".image-questions-remove");

  const uploadWrap = container.querySelector(".image-questions-upload-wrap");
  const uploadBtn = container.querySelector(".image-questions-upload-btn");
  const fileInput = container.querySelector(".image-questions-file");
  const preview = container.querySelector(".image-questions-preview");

  const updateCounters = function () {
    const baseQ = parseInt(block?.dataset?.globalQ || "1", 10);
    const rows = rowsWrap.querySelectorAll(".image-questions-row");

    rows.forEach((row, index) => {
      const label = row.querySelector(".image-question-label");
      if (label) label.textContent = `Q${baseQ + index}`;
    });

    const generatedCount = Math.max(rows.length, 1);
    if (block) {
      block.dataset.generatedQuestions = generatedCount;
      const next = baseQ + generatedCount - 1;
      if (next > window.__globalQuestionCounter) {
        window.__globalQuestionCounter = next;
      }
    }
  };

  const addRow = function (questionText = "", answerValue = "") {
    const row = document.createElement("div");
    row.className = "image-questions-row";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "58px 1fr 1fr";
    row.style.gap = "8px";
    row.style.marginTop = "8px";
    row.innerHTML = `
      <div class="image-question-label" style="font-weight:700; align-self:center;">Q1</div>
      <input
        class="image-question-text"
        placeholder="Question text"
        style="width:100%; padding:10px; border-radius:8px; border:1px solid #e5e5ea; box-sizing:border-box;"
      />
      <input
        class="image-question-answer"
        placeholder="True answer"
        style="width:100%; padding:10px; border-radius:8px; border:1px solid #e5e5ea; box-sizing:border-box;"
      />
    `;
    row.querySelector(".image-question-text").value = questionText;
    row.querySelector(".image-question-answer").value = answerValue;
    rowsWrap.appendChild(row);
    updateCounters();
  };

  addBtn.onclick = function () {
    addRow("", "");
  };

  removeBtn.onclick = function () {
    const rows = rowsWrap.querySelectorAll(".image-questions-row");
    if (rows.length <= 1) return;
    rows[rows.length - 1].remove();
    updateCounters();
  };

  uploadBtn.onclick = function () {
    fileInput.click();
  };

  fileInput.onchange = async function () {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";
      const uploaded = await AdminReading.uploadImageFile(file);
      uploadWrap.dataset.imageUrl = uploaded.relativeUrl;
      preview.innerHTML = `
        <img src="${uploaded.fullUrl}" alt="Uploaded image"
             style="width:100%; max-width:100%; height:auto; display:block; border-radius:12px;" />
        <button type="button" class="image-questions-remove-image" style="margin-top:8px;">Remove image</button>
      `;
      const removeImageBtn = preview.querySelector(".image-questions-remove-image");
      if (removeImageBtn) {
        removeImageBtn.onclick = function () {
          uploadWrap.dataset.imageUrl = "";
          preview.innerHTML = "";
          fileInput.value = "";
        };
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Upload failed");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload image";
    }
  };

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const existingImage = String(first.image_url || first.meta?.image_url || "").trim();
    if (existingImage) {
      uploadWrap.dataset.imageUrl = existingImage;
      const fullUrl = /^https?:\/\//i.test(existingImage)
        ? existingImage
        : `${window.API}${existingImage.startsWith("/") ? existingImage : `/${existingImage}`}`;
      preview.innerHTML = `
        <img src="${fullUrl}" alt="Uploaded image"
             style="width:100%; max-width:100%; height:auto; display:block; border-radius:12px;" />
        <button type="button" class="image-questions-remove-image" style="margin-top:8px;">Remove image</button>
      `;
      const removeImageBtn = preview.querySelector(".image-questions-remove-image");
      if (removeImageBtn) {
        removeImageBtn.onclick = function () {
          uploadWrap.dataset.imageUrl = "";
          preview.innerHTML = "";
          fileInput.value = "";
        };
      }
    }

    data.forEach((item) => {
      addRow(item.content?.text || "", item.correct_answer?.value || "");
    });
  } else {
    addRow("", "");
  }
});
