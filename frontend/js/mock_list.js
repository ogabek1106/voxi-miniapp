// frontend/js/mock_list.js
window.showMockList = async function () {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <h3>🎯 IELTS Mock Tests</h3>

    <div id="mock-list">
      <p style="opacity:0.6;">Loading mocks...</p>
    </div>

    <button onclick="goHome()" style="margin-top:12px;">
      ⬅ Back
    </button>
  `;

  loadMockList();
};


async function loadMockList() {

  const wrap = document.getElementById("mock-list");
  if (!wrap) return;

  try {

    const mocks = await apiGet("/mock/list");

    wrap.innerHTML = mocks.length
      ? mocks.map(m => `
          <button 
            style="width:100%; margin-bottom:8px;"
            onclick="openMockWarning(${m.id}, '${m.title}')">
            📦 ${m.title}
          </button>
        `).join("")
      : `<p style="opacity:0.6;">No mocks available</p>`;

  } catch (e) {

    console.error("Mock list error:", e);

    wrap.innerHTML = `
      <p style="color:red;">Failed to load mocks</p>
    `;
  }

}
