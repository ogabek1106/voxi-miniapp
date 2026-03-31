// frontend/js/admin_reading/question_types/tfng/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("tf_ng", function(container, data = null) {

  container.innerHTML = `
    <div class="tfng-editor">

      <label>Statement</label>
      <input
        type="text"
        class="tfng-question"
        placeholder="The passage states that..."
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
      <select class="tfng-correct" style="
        width:100%;
        padding:10px;
        border-radius:8px;
        border:1px solid #e5e5ea;
      ">
        <option value="TRUE">True</option>
        <option value="FALSE">False</option>
        <option value="NOT_GIVEN">Not Given</option>
      </select>

    </div>
  `;

  // Restore data
  if (data) {
    const textInput = container.querySelector(".tfng-question");
    const correctSelect = container.querySelector(".tfng-correct");

    textInput.value = data.content?.text || "";
    correctSelect.value = data.correct_answer?.value || "TRUE";
  }

});
