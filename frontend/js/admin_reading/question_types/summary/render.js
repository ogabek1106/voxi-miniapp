// frontend/js/admin_reading/question_types/summary/render.js

window.AdminReading = window.AdminReading || {};
AdminReading.Summary = AdminReading.Summary || {};

AdminReading.Summary.render = function(container, questions) {

  if (!container || !questions?.length) return;

  const text = questions[0].content?.text || "";
  const wordLimit = questions[0].meta?.word_limit;
  const wordBank = questions[0].meta?.word_bank || [];

  container.innerHTML = `
    <div class="summary-render">

      <p>${text}</p>

      ${wordLimit ? `<p><strong>No more than ${wordLimit} words</strong></p>` : ""}

      ${
        wordBank.length
          ? `<div style="margin:10px 0;">
              <strong>Word bank:</strong> ${wordBank.join(", ")}
            </div>`
          : ""
      }

      <div class="summary-inputs"></div>

    </div>
  `;

  const inputsWrap = container.querySelector(".summary-inputs");

  questions.forEach((q, i) => {
    const input = document.createElement("input");
    input.placeholder = "Answer " + (i + 1);
    input.style = "width:100%; margin-top:6px; padding:10px;";
    inputsWrap.appendChild(input);
  });

};
