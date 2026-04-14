// frontend/js/screens.js
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
  const btnMockPacks = document.getElementById("btn-mock-packs");
  if (btnMockPacks) btnMockPacks.addEventListener("click", showAdminMockPacks);
});

function hideAllScreens() {
  if (screenName) screenName.style.display = "none";
  if (screenHome) screenHome.style.display = "none";
  if (screenMocks) screenMocks.style.display = "none";
  if (screenProfile) screenProfile.style.display = "none";
  if (screenReading) screenReading.style.display = "none";
}
function setBottomNavVisible(visible) {
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;

  nav.style.display = visible ? "flex" : "none";
}
window.goHome = function () {
  hideAllScreens();
  showAnnouncement();
  if (screenHome) screenHome.style.display = "block";
  setBottomNavVisible(true);
  setActiveNav(0);
};

window.goProfile = function () {
  hideAllScreens();
  hideAnnouncement();
  if (screenProfile) {
    screenProfile.style.display = "block";
    renderProfile();
  }
  setBottomNavVisible(false);
  setActiveNav(1);
};
function setActiveNav(index) {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

window.showMocksScreen = function () {
  const content = document.getElementById("content");
  if (content) content.style.padding = "12px 16px";
  hideAllScreens();
  hideAnnouncement();
  screenMocks.style.display = "block";
  setBottomNavVisible(false);
  showMockList();
};

window.showMocksEntry = function () {
  if (window.__isAdmin) {
    window.showMocksScreen();
    return;
  }
  alert("WILL BE SOON!");
};

window.showReadingEntry = async function () {
  try {
    const mocks = await apiGet("/mock/list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No reading mocks available.");
      return;
    }

    const mockId = mocks[0].id;
    const gateResult = await TelegramSubGate.enterReadingWithGate(mockId);

    if (!gateResult || !gateResult.ok) {
      showSubscribeGate();
      return;
    }

    startMock(mockId);
  } catch (error) {
    console.error("Reading quick entry error:", error);
    alert("Failed to open reading.");
  }
};

function render(html) {
  if (!screenMocks) return;
  screenMocks.innerHTML = html;
}

function showAnnouncement() {
  const el = document.getElementById("announcement");
  if (el) el.style.display = "flex";
}

function hideAnnouncement() {
  const el = document.getElementById("announcement");
  if (el) el.style.display = "none";
}

window.showAdminPanel = function () {
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>🛠 Admin Panel</h3>
    <button onclick="showAdminMockPacks()">📦 MOCK Packs</button>
    <button onclick="showDbStats()">📊 Database Stats</button>
    <button onclick="goHome()">⬅ Back</button>
  `;
};

window.showDbStats = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) return alert("Open inside Telegram");

  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
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
  setBottomNavVisible(false);
  if (screenReading) {
    screenReading.style.display = "block";
    screenReading.innerHTML = `<h3>📖 Reading screen loaded</h3><p>UI coming next…</p>`;
  }
};
// ===== Reading Timer (60 min, never pauses, water drain) =====
let readingTimerInterval = null;
let readingEndAt = null;

function startReadingTimer(totalSeconds = 60 * 60) {
  const totalMs = totalSeconds * 1000;
  readingEndAt = Date.now() + totalMs;

  if (readingTimerInterval) clearInterval(readingTimerInterval);

  readingTimerInterval = setInterval(() => {
    const now = Date.now();
    const leftMs = Math.max(0, readingEndAt - now);
    const leftSec = Math.ceil(leftMs / 1000);

    const min = Math.floor(leftSec / 60).toString().padStart(2, "0");
    const sec = (leftSec % 60).toString().padStart(2, "0");

    const el = document.getElementById("rt-timer");
    if (!el) return;

    el.textContent = `${min}:${sec}`;

    const ratio = leftMs / totalMs; // 1 → 0

    // color: green -> yellow -> red
    let color = "#22c55e"; // green
    if (ratio < 0.66) color = "#facc15"; // yellow
    if (ratio < 0.33) color = "#ef4444"; // red

    el.style.color = color;
    el.style.background = `linear-gradient(to top, ${color} ${Math.floor(ratio * 100)}%, transparent 0%)`;

    if (leftSec <= 0) {
      clearInterval(readingTimerInterval);
      el.textContent = "00:00";
      el.style.color = "#ef4444";
      // later: auto-submit
    }
  }, 1000);
}

window.showSubscribeGate = function () {
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);

  if (!screenReading) return;

  screenReading.style.display = "block";

  screenReading.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      height:100%;
      text-align:center;
      padding:20px;
      gap:16px;
    ">
      
      <div style="font-size:16px; line-height:1.4;">
        Ooops! Not subscribed yet.<br/>
        Subscribe to use the app ❤️
      </div>

      <button onclick="openChannel()" style="
  position: relative;
  width:100%;
  height:52px;
  border-radius:12px;
  font-weight:700;
  font-size:16px;
  background:#ffe4e6;
  color:#000;
  overflow:hidden;
">
  <div class="subscribe-hearts">
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
  </div>

  <span style="
    position:relative;
    z-index:2;
  ">Subscribe</span>
</button>

      <button onclick="goHome()" style="
        width:100%;
        height:48px;
        border-radius:12px;
        background:#eee;
        color:#000;
        font-weight:500;
      ">
        Cancel
      </button>

    </div>
  `;
};
window.openChannel = function () {
  window.open("https://t.me/IELTSforeverybody", "_blank");
};
