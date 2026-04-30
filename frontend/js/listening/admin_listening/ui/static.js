// frontend/js/listening/admin_listening/ui/static.js
window.AdminListeningStatic = window.AdminListeningStatic || {};

AdminListeningStatic.renderShell = function (container) {
  if (!container) return;

  container.innerHTML = `
    <div class="listening-admin-shell">
      <div class="listening-admin-header">
        <div>
          <h3 class="listening-admin-title">Listening Creator</h3>
          <div class="listening-admin-subtitle">Build the test structure visually</div>
        </div>
        <button class="listening-admin-back" type="button" onclick="openMockPack(window.__currentListeningPackId || window.__currentPackId || 0)">Back</button>
      </div>

      <div class="listening-admin-card listening-admin-setup">
        <label class="listening-field-label">Listening Test Name <span>(optional)</span></label>
        <input id="listening-test-title" type="text" placeholder="Name of the whole Listening test" />

        <label class="listening-field-label">Global Instruction 1 <span>(optional)</span></label>
        <textarea id="listening-global-instruction-1" rows="3" placeholder="Example: You now have some time to look at questions 1 to 10."></textarea>
        <div class="listening-help-text">This instruction appears before Part 1 and cannot be removed.</div>

        <label class="listening-field-label">Time limit minutes <span>(optional, default 60)</span></label>
        <input id="listening-time-limit" type="number" min="1" step="1" />
      </div>

      <div class="listening-admin-actions">
        <button id="listening-save-btn" type="button">Save Listening</button>
        <button id="listening-reload-btn" type="button">Reload</button>
        <div id="listening-save-status" class="listening-save-status"></div>
      </div>

      <div id="listening-sections-root" class="listening-parts-root"></div>

      <button id="listening-add-section-btn" class="listening-add-block-btn" type="button">Add Block</button>
    </div>
  `;
};
