// frontend/js/mock_start.js
window.openMockWarning = function (packId, title) {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <h3>📦 ${title}</h3>

    <h4>⚠ IELTS Mock Test Warning</h4>

    <p style="text-align:left; line-height:1.5;">
      • The timer will start immediately<br>
      • Do not refresh the page<br>
      • Complete all sections in order
    </p>

    <button onclick="startMock(${packId})">
      ▶ Start Test
    </button>

    <button onclick="showMockList()" style="margin-top:10px;">
      ⬅ Back
    </button>
  `;
};
