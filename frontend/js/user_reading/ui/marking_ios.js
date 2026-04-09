// frontend/js/user_reading/ui/marking_ios.js

window.UserReading = window.UserReading || {};
window.UserReadingIOS = window.UserReadingIOS || {};

UserReadingIOS.initMarkModeIOS = function () {
  const toggle = document.getElementById("reading-mark-toggle");
  if (!toggle) return;

  UserReadingIOS.__markMode = false;

  function setMarkMode(enabled) {
    UserReadingIOS.__markMode = enabled;
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
  }

  function clearSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }

  function applySelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;

    try {
      const range = selection.getRangeAt(0).cloneRange();
      UserReading.applyHighlight(range);
      clearSelection();
      return true;
    } catch (error) {
      clearSelection();
      return false;
    }
  }

  function onSelectionChange() {
    if (!UserReadingIOS.__markMode) return;
    applySelectedText();
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
