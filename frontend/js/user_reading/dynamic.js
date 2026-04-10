// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  if (!content) return;

  let nextQuestionNumber = 1;

  content.innerHTML = (data.passages || [])
    .map((passage, pi) => {
      const passageHtml = UserReading.renderPassage(
        passage,
        pi,
        nextQuestionNumber
      );

      nextQuestionNumber += passage?.questions?.length || 0;
      return passageHtml;
    })
    .join("");

  UserReading.initHeader(data);
};

UserReading.renderPassage = function (passage, passageIndex, startingQuestionNumber = 1) {
  return `
    ${UserReading.renderPassageView(passage, passageIndex)}

    ${UserReading.renderQuestionsForPassage(passage, passageIndex, startingQuestionNumber)}
  `;
};
