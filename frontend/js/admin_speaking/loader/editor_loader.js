window.showPackSpeakingEditor = async function (packId) {
  if (typeof hideAllScreens === "function") hideAllScreens();
  if (typeof hideAnnouncement === "function") hideAnnouncement();
  if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);

  AdminSpeakingState.set({
    currentPackId: Number(packId || 0) || null,
    currentTestId: null
  });

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;
  screen.style.display = "block";
  screen.innerHTML = `<p style="opacity:0.7;">Loading speaking editor...</p>`;

  try {
    const existing = await AdminSpeakingApi.loadByPack(packId);
    if (existing?.id) {
      AdminSpeakingState.set({ currentTestId: Number(existing.id) });
      AdminSpeakingEditor.render({ test: existing });
      return;
    }
  } catch (error) {
    console.error("Load pack speaking error:", error);
  }

  AdminSpeakingEditor.render({
    test: {
      id: null,
      title: "",
      time_limit_minutes: 18,
      status: "draft",
      parts: [
        { part_number: 1, order_index: 1 },
        { part_number: 2, order_index: 2 },
        { part_number: 3, order_index: 3 }
      ]
    }
  });
};
