// frontend/js/mock_start.js
window.openMockWarning = function (packId, title) {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <h3>📦 ${title}</h3>

    <h4>⚠ IELTS Mock Test Warning</h4>

    <p style="text-align:left; line-height:1.5;">
      • The timer will start immediately<br>
      • Do not refresh the page<br>
      • Complete all sections in order
    </p>

    <button onclick="startMock(${packId})">
      ▶ Start Test
    </button>

    <button onclick="showMockList()" style="margin-top:10px;">
      ⬅ Back
    </button>
  `;
};

window.startMock = async function (mockId) {

  hideAllScreens();
  hideAnnouncement();

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenReading) return;

  screenReading.style.display = "block";
  screenReading.innerHTML = `<h3>📖 Loading Reading…</h3>`;

  try {

    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    const data = await apiGet(`/mock-tests/${mockId}/reading/start?telegram_id=${telegramId}`);

    if (!data || !data.passages) {
      screenReading.innerHTML = `
        <h3>❌ Invalid API response</h3>
        <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">
${JSON.stringify(data, null, 2)}
        </pre>
      `;
      return;
    }

    screenReading.innerHTML = `
      <h3 style="margin-top:6px;">📖 Reading Test</h3>

      ${data.passages.map((p, pi) => `
        <div style="margin-bottom:24px; text-align:left;">
          <h4>Passage ${pi + 1}</h4>
          <p style="white-space:pre-wrap; line-height:1.5;">${p.text}</p>

          ${p.questions.map(q => `
            <div style="margin:12px 0; padding:12px; border-radius:8px; background:#f4f4f6;">
              <div style="font-weight:600; margin-bottom:6px;">
                Q${q.id}
              </div>

              <input 
                placeholder="Type your answer…" 
                style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;"
              />

            </div>
          `).join("")}
        </div>
      `).join("")}
    `;

  } catch (e) {

    screenReading.innerHTML = `
      <h3>❌ Reading load failed</h3>
      <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">
${e.message}
      </pre>
    `;

    console.error(e);

  }

};
