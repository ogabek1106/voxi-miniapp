// frontend/js/admin_reading/ui/images.js
window.AdminReading = window.AdminReading || {};
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
