// frontend/js/user_reading/ui/result_view.js
window.UserReading = window.UserReading || {};

UserReading.renderResultPage = function (container, data = {}) {
  if (!container) return;

  const band = Number(data.band ?? 7.5);
  const correct = data.correct ?? 34;
  const total = data.total ?? 40;

  const today = new Date();
const formattedDate = today.toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

container.innerHTML = `
  <div class="reading-result-page">

  <div class="reading-result-card-wrapper">
    <div class="reading-result-card" id="reading-result-card">
      <div class="reading-result-card-type">IELTS Reading</div>

      <div class="reading-result-band-box">
        <div class="reading-result-band-value" id="reading-result-band-value">0.0</div>
      </div>

      <div class="reading-result-score">Score: ${correct}/${total}</div>

      <div class="reading-result-date">${formattedDate}</div>

      <div class="reading-result-brand">Powered by EBAI Academy</div>
    </div>
  </div>

  <div class="reading-result-actions">
    <div class="result-action-item" id="result-share-btn">
      <div class="result-action-circle">🔗</div>
      <div class="result-action-label">Share</div>
    </div>

    <div class="result-action-item" id="result-story-btn">
      <div class="result-action-circle">📸</div>
      <div class="result-action-label">Story</div>
    </div>

    <div class="result-action-item" id="result-save-btn">
      <div class="result-action-circle">⬇️</div>
      <div class="result-action-label">Save</div>
    </div>
  </div>

</div>
`;
  UserReading.animateBandValue(band);
  UserReading.initResultActions({
    band,
    correct,
    total
  });
};

UserReading.animateBandValue = function (targetBand) {
  const el = document.getElementById("reading-result-band-value");
  if (!el) return;

  let current = 0;
  const step = 0.1;

  function tick() {
    if (current >= targetBand) {
      el.textContent = targetBand.toFixed(1);
      return;
    }

    current = Math.min(current + step, targetBand);
    el.textContent = current.toFixed(1);

    // dynamic speed:
    const remaining = targetBand - current;

    let delay;
    if (remaining > 1.0) {
      delay = 20; // very fast at start
    } else if (remaining > 0.5) {
      delay = 50; // medium
    } else {
      delay = 120; // slow at the end (important!)
    }

    setTimeout(tick, delay);
  }

  tick();
};

UserReading.initResultActions = function (data) {
  const shareBtn = document.getElementById("result-share-btn");
  const storyBtn = document.getElementById("result-story-btn");
  const saveBtn = document.getElementById("result-save-btn");

  if (shareBtn) {
    shareBtn.onclick = function () {
      UserReading.shareResult(data);
    };
  }

  if (storyBtn) {
    storyBtn.onclick = function () {
      UserReading.shareStoryResult(data);
    };
  }

  if (saveBtn) {
    saveBtn.onclick = function () {
      UserReading.saveResultCard();
    };
  }
};
UserReading.shareStoryResult = function () {
  const tg = window.Telegram?.WebApp;

  if (!tg || typeof tg.showAlert !== "function") {
    alert("Story sharing is not ready yet.");
    return;
  }

  tg.showAlert("Story sharing will be enabled after we connect the result card image URL.");
};
UserReading.shareResult = function ({ band, correct, total }) {
  const botLink = "https://t.me/voxi_aibot"; // change if needed

  const text =
    `I got Band ${band} in IELTS Reading (${correct}/${total}) 📘\n\n` +
    `Try it yourself:\n${botLink}`;

  const url = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(text)}`;

  window.open(url, "_blank");
};

UserReading.saveResultCard = async function () {
  const card = document.getElementById("reading-result-card");
  if (!card || typeof html2canvas !== "function") {
    alert("Save is not available.");
    return;
  }

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "voxi-ielts-result.png";
    link.click();
  } catch (error) {
    console.error("Failed to save result card:", error);
    alert("Failed to save image.");
  }
};

UserReading.uploadResultCardImage = async function () {
  const card = document.getElementById("reading-result-card");
  if (!card || typeof html2canvas !== "function") {
    throw new Error("Result card is not available.");
  }

  const canvas = await html2canvas(card, {
    backgroundColor: null,
    scale: 2,
    useCORS: true
  });

  const imageBase64 = canvas.toDataURL("image/png");

  const response = await fetch(`${window.API}/result-images/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image_base64: imageBase64
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to upload result image");
  }

  return response.json();
};

UserReading.showResultBadge = function (text = "Saved!", type = "success") {
  const old = document.getElementById("reading-result-badge");
  if (old) old.remove();

  const badge = document.createElement("div");
  badge.id = "reading-result-badge";
  badge.textContent = text;

  badge.style.position = "fixed";
  badge.style.left = "50%";
  badge.style.bottom = "32px";
  badge.style.transform = "translateX(-50%)";
  badge.style.padding = "10px 16px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "13px";
  badge.style.fontWeight = "700";
  badge.style.color = "#ffffff";
  badge.style.zIndex = "9999";
  badge.style.boxShadow = "0 8px 22px rgba(0,0,0,0.18)";
  badge.style.opacity = "0";
  badge.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  badge.style.pointerEvents = "none";
  badge.style.background = type === "success" ? "#16a34a" : "#dc2626";

  document.body.appendChild(badge);

  requestAnimationFrame(() => {
    badge.style.opacity = "1";
    badge.style.transform = "translateX(-50%) translateY(-6px)";
  });

  setTimeout(() => {
    badge.style.opacity = "0";
    badge.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => badge.remove(), 220);
  }, 1400);
};
