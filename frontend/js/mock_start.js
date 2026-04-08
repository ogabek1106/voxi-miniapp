// frontend/js/mock_start.js
window.openMockWarning = function (packId, title) {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <h3>${title}</h3>

    <h4>IELTS Mock Test Warning</h4>

    <p style="text-align:left; line-height:1.5;">
      - The timer will start immediately<br>
      - Do not refresh the page<br>
      - Complete all sections in order
    </p>

    <button onclick="startMock(${packId})">
      Start Test
    </button>

    <button onclick="showMockList()" style="margin-top:10px;">
      Back
    </button>
  `;
};

window.startMock = async function (mockId) {

  hideAllScreens();
  hideAnnouncement();

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenReading) return;

  screenReading.style.display = "block";
  UserReading.renderLoading(screenReading);

  try {

    const telegramId = window.getTelegramId();
    const data = await apiGet(`/mock-tests/${mockId}/reading/start?telegram_id=${telegramId}`);

    if (!data || !data.passages) {
      UserReading.renderError(screenReading, `Invalid API response\n${JSON.stringify(data, null, 2)}`);
      return;
    }

    UserReading.renderTest(screenReading, data);

  } catch (e) {

    UserReading.renderError(screenReading, e);
    console.error(e);

  }

};