// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  if (!content) return;

  content.innerHTML = (data.passages || [])
    .map((passage, pi) => UserReading.renderPassage(passage, pi))
    .join("");

  UserReading.initHeader(data);
};

UserReading.renderPassage = function (passage, passageIndex) {
  return `
    ${UserReading.renderPassageView(passage, passageIndex)}

    ${UserReading.renderQuestionsForPassage(passage, passageIndex)}
  `;
};
