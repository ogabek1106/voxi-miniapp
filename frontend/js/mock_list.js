// frontend/js/mock_list.js
window.showMockList = async function () {
  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <div class="secondary-screen">
      <div class="secondary-header">
        <h3 class="secondary-title">🎯 IELTS Mock Tests</h3>
        <p class="secondary-subtitle">Choose a mock pack to continue</p>
      </div>

      <div class="secondary-list" id="mock-list">
        <p class="secondary-state">Loading mocks...</p>
      </div>

      <button class="secondary-back" onclick="goHome()">← Back</button>
    </div>
  `;

  loadMockList();
};

async function loadMockList() {
  const wrap = document.getElementById("mock-list");
  if (!wrap) return;

  try {
    const mocks = await apiGet("/mock/list");

    wrap.innerHTML = mocks.length
      ? mocks.map((mock) => renderMockCard(mock)).join("")
      : `<p class="secondary-state">No mocks available</p>`;
  } catch (e) {
    console.error("Mock list error:", e);

    wrap.innerHTML = `
      <p class="secondary-state secondary-state--error">Failed to load mocks</p>
    `;
  }
}

function renderMockCard(mock) {
  const id = Number(mock.id);
  const title = String(mock.title || "IELTS Mock Pack");

  return `
    <button
      class="secondary-card"
      onclick="openMockWarning(${id}, '${escapeMockCallbackText(title)}')">
      <span class="secondary-card-icon" aria-hidden="true">📦</span>
      <span>
        <span class="secondary-card-title">${escapeMockText(title)}</span>
        <span class="secondary-card-subtitle">Full IELTS simulation</span>
      </span>
      <svg class="secondary-card-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </button>
  `;
}

function escapeMockText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMockCallbackText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, " ");
}
