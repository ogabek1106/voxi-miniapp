// frontend/js/admin_reading.js
window.debugTypeChange = function(sel) {

  const value = sel.value;

  // force DOM selected option sync
  Array.from(sel.options).forEach(opt => {
    opt.selected = (opt.value === value);
  });

  console.log("TYPE CHANGE START", value, sel);

  setTimeout(() => {
    console.log("TYPE AFTER 50ms", sel.value, sel);
  }, 50);

  handleQuestionTypeChange(sel);
};

window.__currentPackId = null;
window.__globalQuestionCounter = 1;
window.__currentEditingTestId = null;

window.showPackReading = async function (packId) {
  window.__currentPackId = packId;

  try {
    const test = await apiGet(`/admin/mock-packs/${packId}/reading`);

    if (test && test.id) {
      window.__currentEditingTestId = test.id;
      openAdminReading(test.id);
      return;
    }
  } catch (e) {
    // no reading exists yet
  }

  window.__currentEditingTestId = null;
  window.showCreateReading(true);
};

window.attachImage = function(btn) {
  const wrap = btn.closest(".image-attach-wrap");
  const input = wrap.querySelector(".hidden-image-input");

  input.click();

  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${window.API}/admin/upload-image`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      const fullUrl = window.API + data.url;

      // store relative path in DB
      wrap.dataset.imageUrl = data.url;

      // preview with full URL
      const preview = wrap.querySelector(".image-preview");
      preview.innerHTML = `
        <img src="${fullUrl}" 
             style="
               width:100%;
               max-width:100%;
               height:auto;
               display:block;
               margin:8px auto 0 auto;
               border-radius:12px;
             " />
        <button type="button" onclick="removeImage(this)" style="margin-top:8px;">
          ❌ Remove
        </button>
      `;

    } catch (err) {
      alert("Upload failed");
      console.error(err);
    }
  };
};

window.removeImage = function(btn) {
  const wrap = btn.closest(".image-attach-wrap");
  wrap.dataset.imageUrl = "";
  wrap.querySelector(".image-preview").innerHTML = "";
};
