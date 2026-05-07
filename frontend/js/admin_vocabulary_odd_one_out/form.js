window.AdminVocabularyOddOneOutForm = window.AdminVocabularyOddOneOutForm || {};

(function () {
  const LEVELS = ["", "easy", "medium", "hard"];
  const CATEGORIES = ["", "meaning", "collocation", "grammar", "formality", "ielts", "other"];

  function option(value, selected) {
    const label = value ? value[0].toUpperCase() + value.slice(1) : "Not set";
    return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
  }

  function emptyWords() {
    return [0, 1, 2, 3].map((index) => ({ word_text: "", image_url: "", is_correct: index === 0 }));
  }

  function fullImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `${window.API}${value.startsWith("/") ? value : `/${value}`}`;
  }

  AdminVocabularyOddOneOutForm.render = function () {
    const host = document.getElementById("admin-vocab-form-host");
    if (!host) return;
    const editing = AdminVocabularyOddOneOutState.getEditing();
    const words = editing?.words?.length === 4 ? editing.words : emptyWords();
    host.innerHTML = `
      <form id="admin-vocab-form" class="admin-vocab-card">
        <h3>${editing ? "Edit puzzle set" : "Add puzzle set"}</h3>
        <div id="admin-vocab-message" class="admin-vocab-message" hidden></div>
        <label>Set title</label>
        <input id="vocab-title" value="${AdminVocabularyOddOneOutUI.escape(editing?.title || "")}" placeholder="Optional title">

        <div class="admin-vocab-two">
          <div>
            <label>Level</label>
            <select id="vocab-level">${LEVELS.map((value) => option(value, editing?.level || "")).join("")}</select>
          </div>
          <div>
            <label>Category</label>
            <select id="vocab-category">${CATEGORIES.map((value) => option(value, editing?.category || "")).join("")}</select>
          </div>
        </div>

        <label>Explanation</label>
        <textarea id="vocab-explanation" placeholder="Optional explanation shown after answer">${AdminVocabularyOddOneOutUI.escape(editing?.explanation || "")}</textarea>

        <div class="admin-vocab-word-list">
          ${words.map((word, index) => `
            <div class="admin-vocab-word-row" data-image-url="${AdminVocabularyOddOneOutUI.escape(word.image_url || "")}">
              <div class="admin-vocab-word-main">
                <input class="vocab-word-input" value="${AdminVocabularyOddOneOutUI.escape(word.word_text || "")}" placeholder="Word ${index + 1}" required>
                <label class="admin-vocab-radio">
                  <input type="radio" name="vocab-correct" value="${index}" ${word.is_correct ? "checked" : ""}>
                  Odd
                </label>
              </div>
              <div class="admin-vocab-word-image">
                <div class="admin-vocab-image-preview">
                  ${word.image_url ? `<img src="${AdminVocabularyOddOneOutUI.escape(fullImageUrl(word.image_url))}" alt="Word ${index + 1} image">` : `<span>No image</span>`}
                </div>
                <div class="admin-vocab-image-actions">
                  <button type="button" class="admin-vocab-secondary admin-vocab-image-upload">Upload image</button>
                  <button type="button" class="admin-vocab-image-remove" ${word.image_url ? "" : "hidden"}>Remove</button>
                  <input type="file" class="admin-vocab-image-input" accept="image/*" hidden>
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="admin-vocab-actions">
          <button class="admin-vocab-primary" type="submit">${editing ? "Save changes" : "Save puzzle"}</button>
          ${editing ? `<button class="admin-vocab-secondary" type="button" data-vocab-new="1">New</button>` : ""}
        </div>
      </form>
    `;

    document.getElementById("admin-vocab-form")?.addEventListener("submit", AdminVocabularyOddOneOutForm.submit);
    AdminVocabularyOddOneOutForm.bindImageUploads(host);
    host.querySelector("[data-vocab-new='1']")?.addEventListener("click", () => {
      AdminVocabularyOddOneOutState.setEditing(null);
      AdminVocabularyOddOneOutForm.render();
    });
  };

  AdminVocabularyOddOneOutForm.bindImageUploads = function (host) {
    host.querySelectorAll(".admin-vocab-word-row").forEach((row) => {
      const uploadBtn = row.querySelector(".admin-vocab-image-upload");
      const removeBtn = row.querySelector(".admin-vocab-image-remove");
      const input = row.querySelector(".admin-vocab-image-input");
      const preview = row.querySelector(".admin-vocab-image-preview");
      if (!uploadBtn || !removeBtn || !input || !preview) return;

      uploadBtn.addEventListener("click", () => input.click());
      removeBtn.addEventListener("click", () => {
        row.dataset.imageUrl = "";
        preview.innerHTML = "<span>No image</span>";
        removeBtn.hidden = true;
        input.value = "";
      });
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        const original = uploadBtn.textContent;
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";
        try {
          const uploaded = await AdminVocabularyOddOneOutApi.uploadImageFile(file);
          row.dataset.imageUrl = uploaded.relativeUrl;
          preview.innerHTML = `<img src="${AdminVocabularyOddOneOutUI.escape(uploaded.fullUrl)}" alt="Word image">`;
          removeBtn.hidden = false;
        } catch (error) {
          console.error("Vocabulary word image upload error:", error);
          AdminVocabularyOddOneOutUI.renderMessage("Could not upload image.", "error");
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = original;
          input.value = "";
        }
      });
    });
  };

  AdminVocabularyOddOneOutForm.collect = function () {
    const correctIndex = Number(document.querySelector("input[name='vocab-correct']:checked")?.value ?? -1);
    const words = Array.from(document.querySelectorAll(".admin-vocab-word-row")).map((row, index) => ({
      word_text: row.querySelector(".vocab-word-input")?.value.trim() || "",
      image_url: row.dataset.imageUrl || null,
      is_correct: index === correctIndex,
    }));
    return {
      title: document.getElementById("vocab-title")?.value.trim() || null,
      level: document.getElementById("vocab-level")?.value || null,
      category: document.getElementById("vocab-category")?.value || null,
      explanation: document.getElementById("vocab-explanation")?.value.trim() || null,
      status: AdminVocabularyOddOneOutState.getEditing()?.status || "draft",
      words,
    };
  };

  AdminVocabularyOddOneOutForm.submit = async function (event) {
    event.preventDefault();
    const payload = AdminVocabularyOddOneOutForm.collect();
    const filled = payload.words.filter((word) => word.word_text);
    if (filled.length !== 4 || payload.words.filter((word) => word.is_correct).length !== 1) {
      AdminVocabularyOddOneOutUI.renderMessage("Add exactly 4 words and choose exactly 1 odd answer.", "error");
      return;
    }

    try {
      const editing = AdminVocabularyOddOneOutState.getEditing();
      if (editing) {
        await AdminVocabularyOddOneOutApi.update(editing.id, payload);
      } else {
        await AdminVocabularyOddOneOutApi.create(payload);
      }
      AdminVocabularyOddOneOutUI.renderMessage("Puzzle saved.", "success");
      AdminVocabularyOddOneOutState.setEditing(null);
      await AdminVocabularyOddOneOutLoader.loadList();
      AdminVocabularyOddOneOutForm.render();
    } catch (error) {
      console.error("Vocabulary puzzle save error:", error);
      AdminVocabularyOddOneOutUI.renderMessage("Could not save puzzle. Check all fields.", "error");
    }
  };
})();
