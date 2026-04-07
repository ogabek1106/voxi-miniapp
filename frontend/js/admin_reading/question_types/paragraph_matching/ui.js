// frontend/js/admin_reading/question_types/paragraph_matching/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.renderParagraphMatchingMeta = function(wrap) {

  wrap.innerHTML = `
<div class="paragraph-matching-meta">

  <div class="paragraph-matching-editor" style="margin-top:10px;"></div>

  <div style="display:flex; gap:8px; margin-top:10px;">
    <button type="button" class="paragraph-match-add">Add</button>
    <button type="button" class="paragraph-match-remove">Remove last</button>
  </div>

</div>
`;

};