let screenName;
let screenHome;
let screenMocks;
let screenProfile;
let screenReading;

document.addEventListener("DOMContentLoaded", () => {
  screenName = document.getElementById("screen-name");
  screenHome = document.getElementById("screen-home");
  screenMocks = document.getElementById("screen-mocks");
  screenProfile = document.getElementById("screen-profile");
  screenReading = document.getElementById("screen-reading");

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
  if (screenReading) screenReading.style.display = "none";
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
    renderProfile();
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
  hideAllScreens();
  hideAnnouncement();

  if (screenReading) {
    screenReading.style.display = "block";
    screenReading.innerHTML = `<h3>📖 Loading Reading…</h3>`;
  }

  const data = await apiGet(`/mock-tests/${id}/reading/start`);

  if (screenReading) {
    screenReading.innerHTML = `
      <h3>📖 Reading Test</h3>

      ${data.passages.map((p, pi) => `
        <div style="margin-bottom:24px; text-align:left;">
          <h4>Passage ${pi + 1}</h4>
          <p style="white-space:pre-wrap; line-height:1.5;">${p.text}</p>

          ${p.questions.map(q => `
            <div style="margin:12px 0; padding:12px; border:1px solid #e5e5ea; border-radius:8px;">
              <div style="font-weight:600; margin-bottom:6px;">
                Q${q.id}. ${q.text}
              </div>
              <input 
                data-qid="${q.id}" 
                placeholder="Type your answer…" 
                style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;"
              />
            </div>
          `).join("")}
        </div>
      `).join("")}
    `;
  }
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

    if (!me.name) {
      hideAllScreens();
      hideAnnouncement();
      screenName.style.display = "block";
      return;
    }

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

    const name = me.name || "";
    const surname = me.surname || "";

    screenProfile.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
        <div style="
          width:96px; height:96px;
          border-radius:50%;
          background:#1f1f2a;
          display:flex; align-items:center; justify-content:center;
          font-size:40px;
        ">
          🦊
        </div>

        <div style="width:100%; margin: 0 auto;">
          <div style="
            width:100%;
            max-width: 300px; 
            margin: 0 auto; 
            box-sizing: border-box;
            background: var(--card-bg);
            border: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            border-radius:16px;
            padding:16px 14px;
            text-align:left;
          ">
            <div style="margin-bottom:16px; text-align:center;">
              <div style="font-size:18px; font-weight:600;">${name || "&nbsp;"}</div>
              <div style="height:1px; background:var(--border-color); opacity:0.6; margin-top:6px;"></div>
              <div style="font-size:10px; opacity:0.45; margin-top:4px;">Your name</div>
            </div>

            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:600;">${surname || "&nbsp;"}</div>
              <div style="height:1px; background:var(--border-color); opacity:0.6; margin-top:6px;"></div>
              <div style="font-size:10px; opacity:0.45; margin-top:4px;">Your surname</div>
            </div>
          </div>
        </div>

        <button onclick="editProfile()" style="
          background:none;
          border:none;
          color: var(--primary);
          font-size:14px;
          padding:0;
          cursor:pointer;
        ">Edit profile</button>
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

window.editProfile = function () {
  screenProfile.innerHTML = `
    <h3>Edit profile</h3>
    <input id="edit-name" placeholder="Name" style="width:100%; padding:12px; margin-bottom:8px;" />
    <input id="edit-surname" placeholder="Surname" style="width:100%; padding:12px; margin-bottom:12px;" />
    <button onclick="saveProfile()">Save</button>
    <button onclick="renderProfile()" style="margin-top:8px; background:#ddd; color:#000;">Cancel</button>
  `;
};

window.saveProfile = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const name = document.getElementById("edit-name").value.trim();
  const surname = document.getElementById("edit-surname").value.trim();

  await apiPost(`/me?telegram_id=${telegramId}`, { name, surname });
  renderProfile();
};

window.showReadingScreen = function () {
  hideAllScreens();
  hideAnnouncement();
  if (screenReading) {
    screenReading.style.display = "block";
    screenReading.innerHTML = `<h3>📖 Reading screen loaded</h3><p>UI coming next…</p>`;
  }
};
