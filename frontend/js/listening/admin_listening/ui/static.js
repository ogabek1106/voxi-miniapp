// frontend/js/listening/admin_listening/ui/static.js
window.AdminListeningStatic = window.AdminListeningStatic || {};

AdminListeningStatic.renderShell = function (container) {
  if (!container) return;

  container.innerHTML = `
    <div class="listening-admin-shell" style="display:flex; flex-direction:column; gap:12px; text-align:left;">
      <h3 style="margin:0;">Listening Editor</h3>
      <div>
        <button type="button" onclick="openMockPack(window.__currentListeningPackId || window.__currentPackId || 0)">⬅ Back to Mock Pack</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; background:var(--card-bg); border-radius:10px; padding:10px;">
        <label style="font-size:13px; opacity:0.8;">Name of Listening (optional)</label>
        <input id="listening-test-title" type="text" placeholder="Listening title" style="width:100%; padding:10px; box-sizing:border-box;" />

        <label style="font-size:13px; opacity:0.8;">Upload audio (one file for whole test)</label>
        <input id="listening-test-audio" type="file" accept="audio/*" />
        <div id="listening-audio-meta" style="font-size:12px; opacity:0.7;"></div>

        <label style="font-size:13px; opacity:0.8;">Time limit minutes (optional, default 60)</label>
        <input id="listening-time-limit" type="number" min="1" step="1" style="width:140px; padding:8px; box-sizing:border-box;" />
      </div>

      <div style="display:flex; gap:8px;">
        <button id="listening-add-section-btn" type="button">Add section</button>
        <button id="listening-remove-section-btn" type="button">Remove last section</button>
      </div>

      <div id="listening-sections-root" style="display:flex; flex-direction:column; gap:12px;"></div>
    </div>
  `;
};
