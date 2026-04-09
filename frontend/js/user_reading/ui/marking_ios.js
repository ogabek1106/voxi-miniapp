// frontend/js/user_reading/ui/marking_ios.js

window.UserReading = window.UserReading || {};
window.UserReadingIOS = window.UserReadingIOS || {};

UserReadingIOS.initMarkModeIOS = function () {
  const toggle = document.getElementById("reading-mark-toggle");
  if (!toggle) return;

  UserReadingIOS.__markMode = false;
  UserReadingIOS.__selectionTimer = null;
  UserReadingIOS.__selectionLock = false;

  function setMarkMode(enabled) {
    UserReadingIOS.__markMode = enabled;
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
  }

  function clearSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }

  function applySelectedText() {
    if (UserReadingIOS.__selectionLock) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;

    try {
      const range = selection.getRangeAt(0).cloneRange();
      const text = String(selection.toString() || "").trim();
      if (!text.length) return false;

      document.removeEventListener("selectionchange", onSelectionChange);
      UserReadingIOS.__selectionLock = true;
      UserReading.applyHighlight(range);
      clearSelection();
      UserReadingIOS.__selectionLock = false;
      syncSelectionListener();
      return true;
    } catch (error) {
      clearSelection();
      UserReadingIOS.__selectionLock = false;
      syncSelectionListener();
      return false;
    }
  }

  function onSelectionChange() {
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
