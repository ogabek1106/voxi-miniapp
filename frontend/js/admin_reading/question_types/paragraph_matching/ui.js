// frontend/js/admin_reading/question_types/paragraph_matching/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.renderParagraphMatchingMeta = function(wrap) {

  wrap.innerHTML = `
<div class="paragraph-matching-meta">

  <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
    <label for="paragraph-match-count" style="margin:0;">Paragraph count</label>
    <input
      id="paragraph-match-count"
      class="paragraph-match-count"
      type="number"
      min="1"
      value="5"
      style="width:90px; margin:0; padding:8px; border-radius:8px; border:1px solid #ddd;"
    />
  </div>

  <div class="paragraph-matching-editor" style="margin-top:10px;"></div>

  <div style="display:flex; gap:8px; margin-top:10px;">
    <button type="button" class="paragraph-match-add">Add</button>
    <button type="button" class="paragraph-match-remove">Remove last</button>
  </div>

</div>
`;

};
