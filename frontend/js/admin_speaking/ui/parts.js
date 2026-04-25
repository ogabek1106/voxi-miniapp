window.AdminSpeakingUI = window.AdminSpeakingUI || {};

AdminSpeakingUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

AdminSpeakingUI.renderPartCard = function (partNumber, partData = {}) {
  const instruction = String(partData.instruction || "").trim();
  const question = String(partData.question || "").trim();

  return `
    <div class="speaking-part-card" data-part-number="${partNumber}" style="text-align:left;">
      <div class="speaking-part-header">
        <div class="speaking-part-number">Part ${partNumber}</div>
      </div>

      <label>Instruction</label>
      <textarea class="speaking-part-instruction" rows="3" style="width:100%; max-width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #e5e5ea;">${AdminSpeakingUI.escapeHtml(instruction)}</textarea>

      <label style="margin-top:8px; display:block;">Question</label>
      <textarea class="speaking-part-question" rows="5" style="width:100%; max-width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #e5e5ea;">${AdminSpeakingUI.escapeHtml(question)}</textarea>
    </div>
  `;
};

AdminSpeakingUI.readPartData = function (partCard, partNumber) {
  const instruction = String(partCard.querySelector(".speaking-part-instruction")?.value || "").trim();
  const question = String(partCard.querySelector(".speaking-part-question")?.value || "").trim();

  return {
    part_number: partNumber,
    order_index: partNumber,
    instruction: instruction || null,
    question: question || null
  };
};
