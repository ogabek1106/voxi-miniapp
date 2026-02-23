// frontend/js/admin_reading.js
window.showCreateReading = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>➕ Create Reading Test</h3>

    <label style="display:block; text-align:left; margin-top:12px;">
      Reading name
    </label>
    <input id="reading-title" placeholder="e.g. Cambridge 19 – Test 1" />

    <button style="margin-top:16px;" onclick="createReadingTestNext()">
      Next: Add Passage
    </button>

    <button style="margin-top:12px;" onclick="showAdminPanel()">
      ⬅ Back
    </button>
  `;
};

// ===============================
// Admin Reading – Create Test API
// ===============================
window.createReadingTestNext = async function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  if (!title) {
    alert("Enter reading name");
    return;
  }

  try {
    const test = await apiPost("/admin/reading/tests", {
      title: title,
      time_limit_minutes: 60
    });

    // store current test id globally for next steps
    window.__currentReadingTestId = test.id;

    showAddPassage(); // next screen (we add it next)
  } catch (e) {
    console.error(e);
    alert("Failed to create reading test");
  }
};
// TEMP: placeholder until we build Passage UI
window.showAddPassage = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>➕ Add Passage</h3>
    <p>Passage form coming next…</p>
    <button onclick="showCreateReading()">⬅ Back</button>
  `;
};
