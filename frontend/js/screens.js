let screenName;
let screenHome;
let screenMocks;
let screenProfile;

document.addEventListener("DOMContentLoaded", () => {
  screenName = document.getElementById("screen-name");
  screenHome = document.getElementById("screen-home");
  screenMocks = document.getElementById("screen-mocks");
  screenProfile = document.getElementById("screen-profile");

  const btnHome = document.getElementById("btn-home");
  const btnProfile = document.getElementById("btn-profile");

  if (btnHome) btnHome.addEventListener("click", goHome);
  if (btnProfile) btnProfile.addEventListener("click", goProfile);
});


function hideAllScreens() {
  if (screenName) screenName.style.display = "none";
  if (screenHome) screenHome.style.display = "none";
  if (screenMocks) screenMocks.style.display = "none";
  if (screenProfile) screenProfile.style.display = "none";
}

window.goHome = function () {
  if (!screenHome) return console.error("screenHome not ready");
  hideAllScreens();
  screenHome.style.display = "block";
  setActiveNav(0);
};

window.goProfile = function () {
  if (!screenProfile) return console.error("screenProfile not ready");
  hideAllScreens();
  screenProfile.style.display = "block";
  setActiveNav(1);
};


function setActiveNav(index) {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

window.showMocksScreen = function () {
  hideAllScreens();
  screenMocks.style.display = "block";
  renderMocks();
};

function render(html) {
  if (!screenMocks) return;
  screenMocks.innerHTML = html;
}

async function renderMocks() {
  const mocks = await apiGet("/mock-tests");

  render(`
    <h3>IELTS Mock</h3>
    <h4>Available Mock Tests</h4>
    ${mocks.map(m => `
      <button onclick="openMock(${m.id})">${m.title}</button>
    `).join("")}
  `);
}

window.openMock = async function (id) {
  const data = await apiGet(`/mock-tests/${id}/info`);

  render(`
    <h3>${data.title}</h3>
    <pre style="white-space: pre-wrap">${data.attention}</pre>
    <button onclick="startMock(${id})">Start</button>
    <button onclick="renderMocks()">Cancel</button>
  `);
};

window.startMock = async function (id) {
  const data = await apiGet(`/mock-tests/${id}/start`);

  render(`
    <h3>Reading</h3>
    <p>${data.passage}</p>
    <form id="answersForm">
      ${data.questions.map(q => `
        <div style="margin-bottom: 12px;">
          <p><b>${q.text}</b></p>
          ${q.options.map((opt, idx) => `
            <label style="display:block;">
              <input type="radio" name="q_${q.id}" value="${idx}" />
              ${opt}
            </label>
          `).join("")}
        </div>
      `).join("")}
      <button type="submit">Submit</button>
    </form>
  `);

  document.getElementById("answersForm").onsubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const answers = {};
    for (const [key, value] of formData.entries()) {
      answers[Number(key.replace("q_", ""))] = Number(value);
    }

    if (Object.keys(answers).length !== data.questions.length) {
      alert("Please answer all questions");
      return;
    }

    const result = await apiPost(`/mock-tests/${id}/submit`, { answers });

    render(`
      <h3>Score</h3>
      <p>${result.score} / ${result.total}</p>
      <ul>
        ${result.details.map(d => `
          <li>Question ${d.question_id}: ${d.correct ? "✅ Correct" : "❌ Wrong"}</li>
        `).join("")}
      </ul>
      <button onclick="renderMocks()">Back to Mock Tests</button>
    `);
  };
};
