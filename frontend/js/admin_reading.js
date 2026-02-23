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

