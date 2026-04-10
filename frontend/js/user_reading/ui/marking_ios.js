// frontend/js/user_reading/ui/marking_ios.js

window.UserReading = window.UserReading || {};
window.UserReadingIOS = window.UserReadingIOS || {};

UserReadingIOS.initMarkModeIOS = function () {
  const toggle = document.getElementById("reading-mark-toggle");
  const existingPanel = document.getElementById("ios-mark-debug-panel");
  if (existingPanel) existingPanel.remove();
  if (UserReadingIOS.__selectionTimer) {
    clearTimeout(UserReadingIOS.__selectionTimer);
    UserReadingIOS.__selectionTimer = null;
  }
  if (UserReadingIOS.__selectionEndTimer) {
    clearTimeout(UserReadingIOS.__selectionEndTimer);
    UserReadingIOS.__selectionEndTimer = null;
  }
  if (UserReadingIOS.__touchEndHandler) {
    document.removeEventListener("touchend", UserReadingIOS.__touchEndHandler);
    document.removeEventListener("mouseup", UserReadingIOS.__touchEndHandler);
    UserReadingIOS.__touchEndHandler = null;
  }
  if (UserReadingIOS.__selectionChangeHandler) {
    document.removeEventListener("selectionchange", UserReadingIOS.__selectionChangeHandler);
    UserReadingIOS.__selectionChangeHandler = null;
  }

  UserReadingIOS.__markMode = false;
  UserReadingIOS.__lastSelectionText = "";
  UserReadingIOS.__lastAppliedText = "";
  UserReadingIOS.__lastSelectionRange = null;
  UserReadingIOS.__lastSelectionTs = 0;

  if (toggle) {
    toggle.classList.remove("reading-mark-toggle-active");
    toggle.style.display = "none";
    toggle.onclick = null;
  }

  return;

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
  UserReadingIOS.__lastSelectionText = "";
  UserReadingIOS.__lastAppliedText = "";
  UserReadingIOS.__selectionEndTimer = null;
  UserReadingIOS.__lastSelectionRange = null;
  UserReadingIOS.__lastSelectionTs = 0;
  const content = document.getElementById("reading-user-content");

  function setMarkMode(enabled) {
    UserReadingIOS.__markMode = enabled;
    toggle.classList.toggle("reading-mark-toggle-active", enabled);
    log(`mode: ${enabled ? "ON" : "OFF"}`);
    log(`toggle class: ${toggle.classList.contains("reading-mark-toggle-active") ? "active" : "inactive"}`);
  }

  function clearSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
    log("selection cleared");
  }

  function selectionInsideContent(selection) {
    if (!content || !selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    return !!node && content.contains(node);
  }

  function snapshotSelection(selection) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    if (!selectionInsideContent(selection)) return;

    const text = String(selection.toString() || "").trim();
    if (!text.length) return;

    UserReadingIOS.__lastSelectionRange = selection.getRangeAt(0).cloneRange();
    UserReadingIOS.__lastSelectionText = text;
    UserReadingIOS.__lastSelectionTs = Date.now();
    log(`snapshot text="${text.slice(0, 40)}"`);
  }

  function applyRange(range, text, source) {
    if (!range || !text.length) return false;
    if (text === UserReadingIOS.__lastAppliedText) {
      log("ignored: duplicate selection");
      return false;
    }

    try {
      UserReadingIOS.__lastAppliedText = text;
      log(`highlight start source=${source} text="${text.slice(0, 40)}"`);
      UserReading.applyHighlight(range);
      log("highlight success");
      setTimeout(() => {
        clearSelection();
      }, 120);
      return true;
    } catch (error) {
      clearSelection();
      log(`highlight error: ${String(error?.message || error).slice(0, 60)}`);
      return false;
    }
  }

  function applySelectedText() {
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    log(`selection check rc=${selection?.rangeCount || 0} collapsed=${selection?.isCollapsed ? "yes" : "no"} text="${text.slice(0, 40)}"`);
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && selectionInsideContent(selection) && text.length) {
      snapshotSelection(selection);
      return applyRange(selection.getRangeAt(0).cloneRange(), text, "live");
    }

    const recentEnough = Date.now() - UserReadingIOS.__lastSelectionTs < 2000;
    if (recentEnough && UserReadingIOS.__lastSelectionRange && UserReadingIOS.__lastSelectionText) {
      log(`using cached selection text="${UserReadingIOS.__lastSelectionText.slice(0, 40)}"`);
      return applyRange(UserReadingIOS.__lastSelectionRange.cloneRange(), UserReadingIOS.__lastSelectionText, "cached");
    }

    if (!selection || selection.rangeCount === 0) {
      log("ignored: no selection");
      return false;
    }
    if (!selectionInsideContent(selection)) {
      log("ignored: outside content");
      return false;
    }
    if (selection.isCollapsed) {
      log("ignored: collapsed");
      return false;
    }
    log("ignored: empty text");
    return false;
  }

  function onSelectionChange() {
    log(`selection change mode=${UserReadingIOS.__markMode ? "ON" : "OFF"}`);
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    if (UserReadingIOS.__markMode && selection && !selection.isCollapsed && selectionInsideContent(selection)) {
      snapshotSelection(selection);
      log(`selection ready text="${text.slice(0, 40)}"`);
    }
  }

  function handleSelectionEnd() {
    if (!UserReadingIOS.__markMode) return;
    if (UserReadingIOS.__selectionEndTimer) {
      clearTimeout(UserReadingIOS.__selectionEndTimer);
    }

    UserReadingIOS.__selectionEndTimer = setTimeout(() => {
      UserReadingIOS.__selectionEndTimer = null;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        log("ignored: no stable selection");
        return;
      }
      if (!selectionInsideContent(selection)) {
        log("ignored: stable selection outside content");
        return;
      }
      applySelectedText();
    }, 240);
  }

  function syncSelectionListener() {
    document.removeEventListener("selectionchange", onSelectionChange);
    if (UserReadingIOS.__markMode) {
      document.addEventListener("selectionchange", onSelectionChange);
    }
  }

  if (UserReadingIOS.__touchEndHandler) {
    document.removeEventListener("touchend", UserReadingIOS.__touchEndHandler);
    document.removeEventListener("mouseup", UserReadingIOS.__touchEndHandler);
  }
  UserReadingIOS.__touchEndHandler = handleSelectionEnd;
  document.addEventListener("touchend", handleSelectionEnd);
  document.addEventListener("mouseup", handleSelectionEnd);

  toggle.onclick = function () {
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    log(`pencil clicked mode=${UserReadingIOS.__markMode ? "ON" : "OFF"} hasSelection=${selection && !selection.isCollapsed ? "yes" : "no"} text="${text.slice(0, 40)}"`);

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && selectionInsideContent(selection)) {
      snapshotSelection(selection);
    }

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
