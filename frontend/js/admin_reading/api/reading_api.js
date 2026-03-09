// frontend/js/admin_reading/api/reading_api.js
window.AdminReading = window.AdminReading || {};
window.collectReadingFormData = function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  const passages = [];
  document.querySelectorAll(".passage-block").forEach((p, pi) => {
    const passageTitle = p.querySelector(".passage-title")?.value || null;
    const passageText = p.querySelector(".passage-text")?.value || "";

    const questions = [];
    p.querySelectorAll(".question-block").forEach((q, qi) => {
      questions.push({
        type: q.querySelector(".q-type")?.value,
        text: q.querySelector(".q-text")?.value,
        correct_answer: q.querySelector(".q-answer")?.value,
        order_index: qi + 1,
      });
    });

    passages.push({
      title: passageTitle,
      text: passageText,
      order_index: pi + 1,
      questions,
    });
  });

  return { title, time_limit_minutes: time, passages };
};
