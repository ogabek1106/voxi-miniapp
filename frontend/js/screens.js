// frontend/js/screens.js
let screenName;
let screenHome;
let screenMocks;
let screenProfile;
let screenReading;
let screenWriting;
let screenSpeaking;

document.addEventListener("DOMContentLoaded", () => {
  screenName = document.getElementById("screen-name");
  screenHome = document.getElementById("screen-home");
  screenMocks = document.getElementById("screen-mocks");
  screenProfile = document.getElementById("screen-profile");
  screenReading = document.getElementById("screen-reading");
  screenWriting = document.getElementById("screen-writing");
  screenSpeaking = document.getElementById("screen-speaking");

  const btnHome = document.getElementById("btn-home");
  const btnProfile = document.getElementById("btn-profile");

  if (btnHome) btnHome.addEventListener("click", goHome);
  if (btnProfile) btnProfile.addEventListener("click", goProfile);
  const btnMockPacks = document.getElementById("btn-mock-packs");
  if (btnMockPacks) btnMockPacks.addEventListener("click", showAdminMockPacks);
});

function hideAllScreens() {
  if (window.MockTransitionPage?.cleanup) {
    window.MockTransitionPage.cleanup();
  }
  if (screenName) screenName.style.display = "none";
  if (screenHome) screenHome.style.display = "none";
  if (screenMocks) screenMocks.style.display = "none";
  if (screenProfile) screenProfile.style.display = "none";
  if (screenReading) screenReading.style.display = "none";
  if (screenWriting) screenWriting.style.display = "none";
  if (screenSpeaking) screenSpeaking.style.display = "none";
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
  if (typeof window.refreshVcoinBalance === "function") {
    window.refreshVcoinBalance({ animate: true });
  }
};

window.goProfile = function () {
  hideAllScreens();
  hideAnnouncement();
  if (screenProfile) {
    screenProfile.style.display = "block";
    renderProfile();
  }
  setBottomNavVisible(true);
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
  window.showMocksScreen();
};

window.showReadingEntry = async function () {
  try {
    const mocks = await apiGet("/mock/list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No reading mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No reading mocks available.");
      return;
    }

    startMock(mockId);
  } catch (error) {
    console.error("Reading quick entry error:", error);
    alert("Failed to open reading.");
  }
};

window.showWritingEntry = async function () {
  try {
    const mocks = await apiGet("/mock/writing-list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No writing mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No writing mocks available.");
      return;
    }

    if (typeof window.startWritingMock === "function") {
      window.startWritingMock(mockId);
      return;
    }

    alert("Writing module is not loaded.");
  } catch (error) {
    console.error("Writing quick entry error:", error);
    alert("Failed to open writing.");
  }
};

window.showSpeakingEntry = async function () {
  try {
    const mocks = await apiGet("/mock/speaking-list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No speaking mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No speaking mocks available.");
      return;
    }

    if (typeof window.startSpeakingMock === "function") {
      window.startSpeakingMock(mockId);
      return;
    }

    alert("Speaking module is not loaded.");
  } catch (error) {
    console.error("Speaking quick entry error:", error);
    alert("Failed to open speaking.");
  }
};

window.showListeningEntry = async function () {
  try {
    const mocks = await apiGet("/mock/list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No listening mocks available.");
      return;
    }

    const mockId = Number(mocks[0]?.id || 0);
    if (!mockId) {
      alert("No listening mock found.");
      return;
    }

    if (typeof window.startListeningMock === "function") {
      window.startListeningMock(mockId);
      return;
    }
  } catch (error) {
    console.error("Listening quick entry error:", error);
  }

  alert("Failed to open listening.");
};

function render(html) {
  if (!screenMocks) return;
  screenMocks.innerHTML = html;
}

function hideAnnouncement() {
  const el = document.getElementById("announcement");
  if (!el) return;
  el.style.display = "none";
  el.classList.remove("has-image");
}

function renderAnnouncementData(data) {
  const el = document.getElementById("announcement");
  const textEl = document.getElementById("announcement-text");
  const imageEl = document.getElementById("announcement-image");
  const mediaEl = document.getElementById("announcement-media");
  if (!el || !textEl || !imageEl || !mediaEl) return;

  const text = (data?.text || "").trim();
  const imageUrl = (data?.image_url || "").trim();
  const hasContent = Boolean(text || imageUrl);

  if (!hasContent) {
    hideAnnouncement();
    return;
  }

  textEl.textContent = text || "";
  textEl.style.display = text ? "inline" : "none";

  if (imageUrl) {
    imageEl.src = imageUrl.startsWith("http") ? imageUrl : `${window.API}${imageUrl}`;
    mediaEl.style.display = "block";
    el.classList.add("has-image");
  } else {
    imageEl.removeAttribute("src");
    mediaEl.style.display = "none";
    el.classList.remove("has-image");
  }

  el.style.display = "flex";
}

async function showAnnouncement() {
  try {
    const data = await apiGet("/announcement");
    renderAnnouncementData(data);
  } catch (err) {
    console.error("Failed to load announcement:", err);
    hideAnnouncement();
  }
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
    <button onclick="showAnnouncementAdmin()">📢 Announcement</button>
    <button onclick="showDbStats()">📊 Database Stats</button>
    <button onclick="goHome()">⬅ Back</button>
  `;
};

window.showAnnouncementAdmin = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) return alert("Open inside Telegram");

  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (!screenMocks) return;

  let data = { text: "", image_url: "" };
  try {
    data = await apiGet(`/__admin/announcement?telegram_id=${telegramId}`);
  } catch (e) {
    console.error("Failed to load admin announcement:", e);
  }

  const currentText = data?.text || "";
  const currentImage = data?.image_url || "";
  const previewSrc = currentImage
    ? (currentImage.startsWith("http") ? currentImage : `${window.API}${currentImage}`)
    : "";

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
      <h3 style="margin:0;">📢 Announcement</h3>
      <label style="font-size:13px; color:#607080; font-weight:700;">Text</label>
      <textarea id="announcement-admin-text" placeholder="Announcement text..." style="width:100%; min-height:84px; box-sizing:border-box; border-radius:12px; border:1px solid rgba(20,40,60,0.12); padding:10px;">${currentText}</textarea>
      <label style="font-size:13px; color:#607080; font-weight:700;">Image (optional)</label>
      <input id="announcement-admin-file" type="file" accept="image/*" style="width:100%;">
      <img id="announcement-admin-preview" src="${previewSrc}" style="display:${previewSrc ? "block" : "none"}; width:100%; max-height:220px; object-fit:contain; border-radius:12px; background:#fff; border:1px solid rgba(20,40,60,0.08);" />
      <div style="display:flex; gap:10px;">
        <button onclick="saveAnnouncementAdmin()" style="margin:0;">Save</button>
        <button onclick="clearAnnouncementAdmin()" style="margin:0; background:#e5e7eb; color:#17212B;">Clear</button>
      </div>
      <button onclick="showAdminPanel()" style="margin:0; background:#eef2f7; color:#17212B;">⬅ Back</button>
    </div>
  `;

  const previewEl = document.getElementById("announcement-admin-preview");
  if (previewEl) {
    previewEl.dataset.imageUrl = currentImage || "";
  }
};

async function uploadAnnouncementImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${window.API}/admin/upload-image`, {
    method: "POST",
    body: fd
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Upload failed");
  return JSON.parse(text);
}

window.saveAnnouncementAdmin = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) return alert("Open inside Telegram");

  const textEl = document.getElementById("announcement-admin-text");
  const fileEl = document.getElementById("announcement-admin-file");
  const previewEl = document.getElementById("announcement-admin-preview");
  if (!textEl || !fileEl || !previewEl) return;

  try {
    let imageUrl = previewEl.dataset.imageUrl || "";
    const file = fileEl.files?.[0];
    if (file) {
      const up = await uploadAnnouncementImage(file);
      imageUrl = up.url || "";
    }

    await apiPost(`/__admin/announcement?telegram_id=${telegramId}`, {
      text: textEl.value.trim(),
      image_url: imageUrl
    });
    alert("Announcement saved");
    await showAnnouncementAdmin();
  } catch (e) {
    console.error("Save announcement failed:", e);
    alert("Failed to save announcement");
  }
};

window.clearAnnouncementAdmin = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) return alert("Open inside Telegram");

  try {
    await apiPost(`/__admin/announcement?telegram_id=${telegramId}`, {
      text: "",
      image_url: ""
    });
    alert("Announcement cleared");
    await showAnnouncementAdmin();
  } catch (e) {
    console.error("Clear announcement failed:", e);
    alert("Failed to clear announcement");
  }
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
    const lastActivityHtml = window.ProfileUI?.renderLastActivity(me.last_activity) || "";

    const name = me.name || "";
    const surname = me.surname || "";
    const vCoins = Number(me.v_coins || 0);

    screenProfile.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:16px; width:100%;">
        <div style="
          width:96px; height:96px;
          border-radius:50%;
          background:#1f1f2a;
          display:flex; align-items:center; justify-content:center;
          font-size:40px;
        ">
          🦊
        </div>

        <div style="width:100%; margin:0;">
          <div style="
            width:100%;
            max-width: 100%; 
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

        <div data-vcoin-open="1" role="button" tabindex="0" style="
          width:100%;
          box-sizing:border-box;
          background:var(--card-bg);
          border-radius:14px;
          padding:14px;
          font-size:16px;
          font-weight:700;
          text-align:center;
          cursor:pointer;
        ">
          V-Coin balance: ${vCoins}
        </div>

        ${lastActivityHtml}
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

window.showSubscribeGate = function (mockId = null) {
  if (window.TelegramSubGate?.stopEntryRecheck) {
    window.TelegramSubGate.stopEntryRecheck();
  }
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
      
      <div id="subscribe-gate-message" style="font-size:16px; line-height:1.4;">
        Ooops! Not subscribed yet.<br/>
        Subscribe to use the app ❤️
      </div>

      <button id="subscribe-btn" onclick="openChannel()" style="
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

  <span class="subscribe-btn-label" style="
    position:relative;
    z-index:2;
  ">Subscribe</span>
</button>

      <button id="subscribe-back-btn" onclick="goHome()" style="
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

  window.__subGateMockId = mockId;
  window.__subGateCompleted = false;

  const backBtn = document.getElementById("subscribe-back-btn");
  if (backBtn) {
    backBtn.onclick = function () {
      if (window.TelegramSubGate?.stopEntryRecheck) {
        window.TelegramSubGate.stopEntryRecheck();
      }
      goHome();
    };
  }
};
window.openChannel = function () {
  const tg = window.Telegram?.WebApp;
  const channelUrl = "https://t.me/IELTSforeverybody";
  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(channelUrl);
  } else {
    window.open(channelUrl, "_blank");
  }

  const mockId = window.__subGateMockId;
  if (!mockId || !window.TelegramSubGate?.startEntryRecheck) return;

  const subscribeBtn = document.getElementById("subscribe-btn");
  const subscribeLabel = subscribeBtn?.querySelector(".subscribe-btn-label");
  if (subscribeBtn) {
    subscribeBtn.disabled = true;
    subscribeBtn.style.opacity = "0.85";
  }
  if (subscribeLabel) subscribeLabel.textContent = "Checking...";

  window.TelegramSubGate.startEntryRecheck(mockId, {
    onSuccess: function () {
      window.__subGateCompleted = true;
      const message = document.getElementById("subscribe-gate-message");
      const backBtn = document.getElementById("subscribe-back-btn");
      const mainBtn = document.getElementById("subscribe-btn");

      if (message) {
        message.innerHTML = `Wooo! You subscribed!<br/>Thank you! 🥳`;
      }

      if (mainBtn) {
        mainBtn.remove();
      }

      if (backBtn) {
        backBtn.textContent = "Back to The app";
        backBtn.onclick = function () {
          goHome();
        };
      }
    },
    onTimeout: function () {
      const btn = document.getElementById("subscribe-btn");
      const label = btn?.querySelector(".subscribe-btn-label");
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
      if (label) label.textContent = "Subscribe";
    }
  });
};
