// frontend/js/admin_reading/question_types/matching/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.renderMatchingMeta = function(wrap) {
const block = wrap.closest(".question-block");
if (block) {
  const qLabel = block.firstElementChild;
  if (qLabel) qLabel.style.display = "none";
}
  console.log("STEP 3: renderMatchingMeta called", wrap);

  wrap.innerHTML = `
<div class="matching-meta">

  <label>How many questions</label>
  <input class="match-q-count" type="number" min="1" value="3" />

  <label style="margin-top:6px; display:block;">How many options</label>
  <input class="match-opt-count" type="number" min="2" value="5" />

  <div class="matching-editor" style="margin-top:10px;"></div>

</div>
`;

  console.log("STEP 4: matching meta UI inserted");

};
