// frontend/js/user_reading/ui/marking_ios.js

window.UserListening = window.UserListening || {};
window.UserListeningIOS = window.UserListeningIOS || {};

UserListeningIOS.initMarkModeIOS = function () {
  const toggle = document.getElementById("reading-mark-toggle");
  const existingPanel = document.getElementById("ios-mark-debug-panel");
  if (existingPanel) existingPanel.remove();
  if (UserListeningIOS.__selectionTimer) {
    clearTimeout(UserListeningIOS.__selectionTimer);
    UserListeningIOS.__selectionTimer = null;
  }
  if (UserListeningIOS.__selectionEndTimer) {
    clearTimeout(UserListeningIOS.__selectionEndTimer);
    UserListeningIOS.__selectionEndTimer = null;
  }
  if (UserListeningIOS.__touchEndHandler) {
    document.removeEventListener("touchend", UserListeningIOS.__touchEndHandler);
    document.removeEventListener("mouseup", UserListeningIOS.__touchEndHandler);
    UserListeningIOS.__touchEndHandler = null;
  }
  if (UserListeningIOS.__selectionChangeHandler) {
    document.removeEventListener("selectionchange", UserListeningIOS.__selectionChangeHandler);
    UserListeningIOS.__selectionChangeHandler = null;
  }

  UserListeningIOS.__markMode = false;
  UserListeningIOS.__lastSelectionText = "";
  UserListeningIOS.__lastAppliedText = "";
  UserListeningIOS.__lastSelectionRange = null;
  UserListeningIOS.__lastSelectionTs = 0;

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

  UserListeningIOS.__markMode = false;
  UserListeningIOS.__selectionTimer = null;
  UserListeningIOS.__lastSelectionText = "";
  UserListeningIOS.__lastAppliedText = "";
  UserListeningIOS.__selectionEndTimer = null;
  UserListeningIOS.__lastSelectionRange = null;
  UserListeningIOS.__lastSelectionTs = 0;
  const content = document.getElementById("reading-user-content");

  function setMarkMode(enabled) {
    UserListeningIOS.__markMode = enabled;
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

    UserListeningIOS.__lastSelectionRange = selection.getRangeAt(0).cloneRange();
    UserListeningIOS.__lastSelectionText = text;
    UserListeningIOS.__lastSelectionTs = Date.now();
    log(`snapshot text="${text.slice(0, 40)}"`);
  }

  function applyRange(range, text, source) {
    if (!range || !text.length) return false;
    if (text === UserListeningIOS.__lastAppliedText) {
      log("ignored: duplicate selection");
      return false;
    }

    try {
      UserListeningIOS.__lastAppliedText = text;
      log(`highlight start source=${source} text="${text.slice(0, 40)}"`);
      UserListening.applyHighlight(range);
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

    const recentEnough = Date.now() - UserListeningIOS.__lastSelectionTs < 2000;
    if (recentEnough && UserListeningIOS.__lastSelectionRange && UserListeningIOS.__lastSelectionText) {
      log(`using cached selection text="${UserListeningIOS.__lastSelectionText.slice(0, 40)}"`);
      return applyRange(UserListeningIOS.__lastSelectionRange.cloneRange(), UserListeningIOS.__lastSelectionText, "cached");
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
    log(`selection change mode=${UserListeningIOS.__markMode ? "ON" : "OFF"}`);
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    if (UserListeningIOS.__markMode && selection && !selection.isCollapsed && selectionInsideContent(selection)) {
      snapshotSelection(selection);
      log(`selection ready text="${text.slice(0, 40)}"`);
    }
  }

  function handleSelectionEnd() {
    if (!UserListeningIOS.__markMode) return;
    if (UserListeningIOS.__selectionEndTimer) {
      clearTimeout(UserListeningIOS.__selectionEndTimer);
    }

    UserListeningIOS.__selectionEndTimer = setTimeout(() => {
      UserListeningIOS.__selectionEndTimer = null;
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
    if (UserListeningIOS.__markMode) {
      document.addEventListener("selectionchange", onSelectionChange);
    }
  }

  if (UserListeningIOS.__touchEndHandler) {
    document.removeEventListener("touchend", UserListeningIOS.__touchEndHandler);
    document.removeEventListener("mouseup", UserListeningIOS.__touchEndHandler);
  }
  UserListeningIOS.__touchEndHandler = handleSelectionEnd;
  document.addEventListener("touchend", handleSelectionEnd);
  document.addEventListener("mouseup", handleSelectionEnd);

  toggle.onclick = function () {
    const selection = window.getSelection();
    const text = String(selection?.toString() || "").trim();
    log(`pencil clicked mode=${UserListeningIOS.__markMode ? "ON" : "OFF"} hasSelection=${selection && !selection.isCollapsed ? "yes" : "no"} text="${text.slice(0, 40)}"`);

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && selectionInsideContent(selection)) {
      snapshotSelection(selection);
    }

    if (!UserListeningIOS.__markMode && selection && !selection.isCollapsed) {
      if (applySelectedText()) {
        setMarkMode(false);
        syncSelectionListener();
        return;
      }
    }

    setMarkMode(!UserListeningIOS.__markMode);
    syncSelectionListener();
  };

  setMarkMode(false);
  syncSelectionListener();
};
