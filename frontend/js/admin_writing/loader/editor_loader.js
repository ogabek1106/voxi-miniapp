window.showPackWriting = async function (packId) {
  if (typeof hideAllScreens === "function") hideAllScreens();
  if (typeof hideAnnouncement === "function") hideAnnouncement();
  if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);

  AdminWritingState.set({
    currentPackId: Number(packId || 0) || null,
    currentTestId: null
  });

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;
  screen.style.display = "block";
  screen.innerHTML = `<p style="opacity:0.7;">Loading writing editor...</p>`;

  try {
    const existing = await AdminWritingApi.loadByPack(packId);
    if (existing?.id) {
      AdminWritingState.set({ currentTestId: Number(existing.id) });
      AdminWritingEditor.render({ test: existing });
      return;
    }
  } catch (error) {
    console.error("Load pack writing error:", error);
  }

  AdminWritingEditor.render({
    test: {
      id: null,
      title: "",
      time_limit_minutes: 60,
      status: "draft",
      tasks: [
        { task_number: 1, order_index: 1 },
        { task_number: 2, order_index: 2 }
      ]
    }
  });
};
