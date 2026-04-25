window.UserSpeakingTransitions = window.UserSpeakingTransitions || {};

UserSpeakingTransitions.showPartSubmitted = function (nextLabel, onDone) {
  const content = document.getElementById("speaking-user-content");
  if (!content) return;

  content.innerHTML = `
    <div class="question-block speaking-transition-card">
      <div class="speaking-transition-title">Submitted.</div>
      <div class="speaking-transition-text">Now you will be directed to ${nextLabel}</div>
      <div class="speaking-transition-loader"></div>
    </div>
  `;

  setTimeout(() => {
    if (typeof onDone === "function") onDone();
  }, 5000);
};

UserSpeakingTransitions.showChecking = function () {
  const content = document.getElementById("speaking-user-content");
  if (!content) return;

  content.innerHTML = `
    <div class="question-block speaking-transition-card">
      <div class="speaking-transition-title">Your answers are being checked</div>
      <div class="speaking-transition-text">Please wait a moment.</div>
      <div class="speaking-transition-loader"></div>
    </div>
  `;
};

UserSpeakingTransitions.showAutoSubmitted = function (onDone) {
  const content = document.getElementById("speaking-user-content");
  if (!content) return;

  content.innerHTML = `
    <div class="question-block speaking-transition-card">
      <div class="speaking-transition-title">Time is over.</div>
      <div class="speaking-transition-text">Your answer has been submitted.</div>
      <div class="speaking-transition-loader"></div>
    </div>
  `;

  setTimeout(() => {
    if (typeof onDone === "function") onDone();
  }, 5000);
};
