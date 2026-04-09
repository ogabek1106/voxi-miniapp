// frontend/js/user_reading/ui/marking_ios.js

window.UserReading = window.UserReading || {};
window.UserReadingIOS = window.UserReadingIOS || {};

UserReadingIOS.initMarkModeIOS = function () {
  const toggle = document.getElementById("reading-mark-toggle");
  const existingPanel = document.getElementById("ios-mark-debug-panel");
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement("div");
  panel.id = "ios-mark-debug-panel";
  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.left = "0";
  panel.style.right = "0";
  panel.style.height = "50vh";
  panel.style.background = "rgba(17,17,17,0.92)";
  panel.style.color = "#fff";
  panel.style.fontSize = "12px";
  panel.style.lineHeight = "1.35";
  panel.style.padding = "6px 8px";
  panel.style.overflowY = "auto";
  panel.style.zIndex = "400";
  panel.style.pointerEvents = "none";
  panel.style.whiteSpace = "pre-wrap";
  document.body.appendChild(panel);

  function log(message) {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const lines = panel.textContent ? panel.textContent.split("\n") : [];
    lines.push(`[${time}] ${message}`);
    panel.textContent = lines.slice(-30).join("\n");
    panel.scrollTop = panel.scrollHeight;
  }

  log("iOS marking initialized");
  log(`ua: ${(navigator.userAgent || "").slice(0, 90)}`);
  log(toggle ? "toggle found" : "toggle missing");
  if (!toggle) return;

  UserReadingIOS.__markMode = false;
  UserReadingIOS.__selectionTimer = null;
  UserReadingIOS.__selectionLock = false;

  function setMarkMode(enabled) {
    UserReadingIOS.__markMode = enabled;
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
    log(`mode: ${enabled ? "ON" : "OFF"}`);
  }

  function clearSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
    log("selection cleared");
  }

  function applySelectedText() {
    if (UserReadingIOS.__selectionLock) return false;

    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    log(`selection check rc=${selection?.rangeCount || 0} collapsed=${selection?.isCollapsed ? "yes" : "no"} text="${text.slice(0, 40)}"`);
    if (!selection || selection.rangeCount === 0) {
      log("ignored: no selection");
      return false;
    }
    if (selection.isCollapsed) {
      log("ignored: collapsed");
      return false;
    }

    try {
      const range = selection.getRangeAt(0).cloneRange();
      if (!text.length) {
        log("ignored: empty text");
        return false;
      }

      document.removeEventListener("selectionchange", onSelectionChange);
      UserReadingIOS.__selectionLock = true;
      log(`highlight start text="${text.slice(0, 40)}"`);
      UserReading.applyHighlight(range);
      clearSelection();
      UserReadingIOS.__selectionLock = false;
      syncSelectionListener();
      log("highlight success");
      return true;
    } catch (error) {
      clearSelection();
      UserReadingIOS.__selectionLock = false;
      syncSelectionListener();
      log(`highlight error: ${String(error?.message || error).slice(0, 60)}`);
      return false;
    }
  }

  function onSelectionChange() {
    log(`selection change mode=${UserReadingIOS.__markMode ? "ON" : "OFF"}`);
    if (!UserReadingIOS.__markMode) return;
    if (UserReadingIOS.__selectionTimer) {
      clearTimeout(UserReadingIOS.__selectionTimer);
    }

    UserReadingIOS.__selectionTimer = setTimeout(() => {
      UserReadingIOS.__selectionTimer = null;
      applySelectedText();
    }, 80);
  }

  function syncSelectionListener() {
    document.removeEventListener("selectionchange", onSelectionChange);
    if (UserReadingIOS.__markMode) {
      document.addEventListener("selectionchange", onSelectionChange);
    }
  }

  toggle.onclick = function () {
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    log(`pencil clicked mode=${UserReadingIOS.__markMode ? "ON" : "OFF"} hasSelection=${selection && !selection.isCollapsed ? "yes" : "no"} text="${text.slice(0, 40)}"`);

    if (!UserReadingIOS.__markMode && selection && !selection.isCollapsed) {
      if (applySelectedText()) {
        setMarkMode(false);
        syncSelectionListener();
        return;
      }
    }

    setMarkMode(!UserReadingIOS.__markMode);
    syncSelectionListener();
  };

  setMarkMode(false);
  syncSelectionListener();
};
