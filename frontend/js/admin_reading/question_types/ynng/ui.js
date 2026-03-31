//// frontend/js/admin_reading/question_types/ynng/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("yes_no_ng", function(container, data = null) {

  container.innerHTML = `
    <div class="ynng-editor">

      <label>Statement</label>
      <input
        type="text"
        class="ynng-question"
        placeholder="The author believes..."
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:8px;
          border:1px solid #e5e5ea;
          margin-bottom:10px;
        "
      />

      <label>Correct answer</label>
      <select class="ynng-correct" style="
        width:100%;
        padding:10px;
        border-radius:8px;
        border:1px solid #e5e5ea;
      ">
        <option value="YES">Yes</option>
        <option value="NO">No</option>
        <option value="NOT_GIVEN">Not Given</option>
      </select>

    </div>
  `;

  // 🔹 Restore data when editing
  if (data) {
    const textInput = container.querySelector(".ynng-question");
    const correctSelect = container.querySelector(".ynng-correct");

    textInput.value = data.content?.text || "";
    correctSelect.value = data.correct_answer?.value || "YES";
  }

});
