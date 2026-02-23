window.showAdminMock = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>🧠 IELTS Mock (Admin)</h3>

    <button onclick="showAdminReadingList()">📖 Reading Section</button>

    <button style="margin-top:12px;" onclick="showAdminPanel()">⬅ Back</button>
  `;
};
