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
  hideAllScreens();
  showAnnouncement();            
  if (screenHome) screenHome.style.display = "block";
  setActiveNav(0);
};

window.goProfile = function () {
  hideAllScreens();
  hideAnnouncement();
  if (screenProfile) {
    screenProfile.style.display = "block";
    renderProfile();   // 👈 load name here
  }
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
  hideAnnouncement();
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
    <button onclick="confirmMockStart(${id})">Start</button>
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

function showAnnouncement() {
  const el = document.getElementById("announcement");
  if (el) el.style.display = "flex";
}

function hideAnnouncement() {
  const el = document.getElementById("announcement");
  if (el) el.style.display = "none";
}
window.confirmMockStart = async function (id) {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (!telegramId) {
    alert("Open this inside Telegram");
    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);

    // ❌ no name → go to name screen
    if (!me.name) {
      hideAllScreens();
      hideAnnouncement();
      screenName.style.display = "block";
      return;
    }

    // ✅ has name → start mock
    startMock(id);

  } catch (e) {
    console.error(e);
    alert("Network error");
  }
};

window.showAdminPanel = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>🛠 Admin Panel</h3>
    <button onclick="showDbStats()">📊 Database Stats</button>
    <button onclick="goHome()">⬅ Back</button>
  `;
};

window.showDbStats = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) return alert("Open inside Telegram");

  hideAllScreens();
  hideAnnouncement();

  try {
    const data = await apiGet(`/__admin/users?telegram_id=${telegramId}`);

    const rows = data.users.map(u => `
      <div style="
        padding: 10px 8px;
        border-bottom: 1px solid #e5e5ea;
        text-align: left;
        font-size: 14px;
      ">
        <b>#${u.id}</b> — ${u.name}
      </div>
    `).join("");

    screenMocks.style.display = "block";
    screenMocks.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <h3 style="margin-bottom:6px;">📊 Database Stats</h3>
        <p style="margin:0 0 8px 0;">Users: <b>${data.total}</b></p>
        <div style="height:1px; background:#e5e5ea; margin:8px 0;"></div>

        <!-- Inner scrollable list -->
        <div style="
          flex:1;
          overflow-y:auto;
          border:1px solid #e5e5ea;
          border-radius:8px;
        ">
          ${rows || "<p style='padding:12px;'>No users yet</p>"}
        </div>

        <button style="margin-top:12px;" onclick="showAdminPanel()">⬅ Back</button>
      </div>
    `;
  } catch (e) {
    console.error(e);
    alert("Failed to load database stats");
  }
};

async function renderProfile() {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (!telegramId) {
    screenProfile.innerHTML = `<p>Open this inside Telegram</p>`;
    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);

    screenProfile.innerHTML = `
      <h3>👤 Profile</h3>
      <div style="margin-top:12px; text-align:left;">
        <p><b>Name:</b> ${me.name}</p>
        <p><b>Telegram ID:</b> ${me.telegram_id}</p>
        ${me.is_admin ? `<p style="color:#8b5cf6;">Admin</p>` : ``}
      </div>
    `;
  } catch (e) {
    console.error(e);
    screenProfile.innerHTML = `
      <p>Could not load profile.</p>
      <button onclick="renderProfile()">Retry</button>
    `;
  }
}
async function renderProfile() {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (!telegramId) {
    screenProfile.innerHTML = `<p>Open this inside Telegram</p>`;
    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);

    const name = me.name || "Name";
    const surname = me.surname || "Surname";
    const nameOpacity = me.name ? "1" : "0.5";
    const surnameOpacity = me.surname ? "1" : "0.5";

    screenProfile.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">

        <!-- Profile avatar -->
        <div style="
          width:96px; height:96px;
          border-radius:50%;
          background:#1f1f2a;
          display:flex; align-items:center; justify-content:center;
          font-size:42px;
        ">
          🦊
        </div>

        <!-- Name Row -->
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px; opacity:${nameOpacity};">${name}</span>
          <span style="font-size:18px; opacity:${surnameOpacity};">${surname}</span>

          <!-- Pen -->
          <button onclick="editProfile()" style="
            background:none; border:none; color:#8b5cf6;
            font-size:18px; cursor:pointer;
          ">✏️</button>
        </div>

      </div>
    `;
  } catch (e) {
    console.error(e);
    screenProfile.innerHTML = `
      <p>Could not load profile.</p>
      <button onclick="renderProfile()">Retry</button>
    `;
  }
}

window.goProfile = function () {
  hideAllScreens();
  hideAnnouncement();
  screenProfile.style.display = "block";
  setActiveNav(1);
  renderProfile();
};
window.editProfile = function () {
  screenProfile.innerHTML = `
    <h3>Edit Profile</h3>
    <input id="edit-name" placeholder="Name" style="width:100%; padding:10px; margin-bottom:8px;" />
    <input id="edit-surname" placeholder="Surname" style="width:100%; padding:10px; margin-bottom:12px;" />
    <button onclick="saveProfile()">Save</button>
    <button onclick="renderProfile()" style="margin-left:8px;">Cancel</button>
  `;
};

window.saveProfile = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const name = document.getElementById("edit-name").value.trim();
  const surname = document.getElementById("edit-surname").value.trim();

  await apiPost(`/me?telegram_id=${telegramId}`, { name, surname });
  renderProfile();
};
