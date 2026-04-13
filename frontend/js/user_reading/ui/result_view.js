// frontend/js/user_reading/ui/result_view.js
window.UserReading = window.UserReading || {};

UserReading.renderResultPage = function (container, data = {}) {
  if (!container) return;

  const band = Number(data.band ?? 0).toFixed(1);
  const correct = Number(data.correct ?? 0);
  const total = Number(data.total ?? 40);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  container.innerHTML = `
    <div class="reading-result-page">
      <div class="reading-result-card-wrapper">
        <div
          class="reading-result-card"
          id="reading-result-card"
          data-band="${band}"
          data-correct="${correct}"
          data-total="${total}"
        >
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

  UserReading.animateBandValue(Number(band));
  UserReading.initResultActions({ band, correct, total });
};

UserReading.animateBandValue = function (targetBand) {
  const el = document.getElementById("reading-result-band-value");
  if (!el) return;

  let current = 0;
  const step = 0.1;

  function tick() {
    if (current >= targetBand) {
      el.textContent = Number(targetBand).toFixed(1);
      return;
    }

    current = Math.min(current + step, targetBand);
    el.textContent = current.toFixed(1);

    const remaining = targetBand - current;
    let delay = 120;
    if (remaining > 1.0) delay = 20;
    else if (remaining > 0.5) delay = 50;

    setTimeout(tick, delay);
  }

  tick();
};

UserReading.initResultActions = function (data) {
  const shareBtn = document.getElementById("result-share-btn");
  const storyBtn = document.getElementById("result-story-btn");
  const saveBtn = document.getElementById("result-save-btn");

  if (shareBtn) shareBtn.onclick = () => UserReading.shareResult(data);
  if (storyBtn) storyBtn.onclick = () => UserReading.shareStoryResult();
  if (saveBtn) saveBtn.onclick = () => UserReading.saveResultCard();
};

UserReading.shareStoryResult = function () {
  const tg = window.Telegram?.WebApp;
  if (tg && typeof tg.showAlert === "function") {
    tg.showAlert("Story sharing will be enabled soon.");
    return;
  }
  alert("Story sharing will be enabled soon.");
};

UserReading.shareResult = function ({ band, correct, total }) {
  const botLink = "https://t.me/voxi_aibot";
  const text =
    `I got Band ${band} in IELTS Reading (${correct}/${total})\n\n` +
    `Try it yourself:\n${botLink}`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
};

UserReading.resultCardToBlob = function ({ band, correct, total, dateText }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f9fbff");
  gradient.addColorStop(1, "#eef5ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cardX = 130;
  const cardY = 130;
  const cardW = canvas.width - 260;
  const cardH = 940;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = "#e6edf7";
  ctx.lineWidth = 3;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  ctx.textAlign = "center";
  ctx.fillStyle = "#00baff";
  ctx.font = "700 48px system-ui, -apple-system, sans-serif";
  ctx.fillText("IELTS Reading", canvas.width / 2, cardY + 90);

  const circleX = canvas.width / 2;
  const circleY = cardY + 360;
  const circleR = 150;
  ctx.fillStyle = "#00baff";
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 120px system-ui, -apple-system, sans-serif";
  ctx.fillText(String(band), circleX, circleY + 40);

  ctx.fillStyle = "#00baff";
  ctx.font = "800 58px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Score: ${correct}/${total}`, canvas.width / 2, cardY + 630);

  ctx.fillStyle = "#6b7280";
  ctx.font = "600 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(dateText, canvas.width / 2, cardY + 715);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "700 30px system-ui, -apple-system, sans-serif";
  ctx.fillText("Powered by EBAI Academy", canvas.width / 2, cardY + 790);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
};

UserReading.blobToDataUrl = function (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

UserReading.uploadResultCardImage = async function (blob) {
  const imageBase64 = await UserReading.blobToDataUrl(blob);
  const payload = await apiPost("/result-images/upload", {
    image_base64: imageBase64
  });

  const url = String(payload?.url || "").trim();
  if (!url) {
    throw new Error("Upload returned empty url");
  }

  if (/^https?:\/\//i.test(url)) {
    return { url, fileName: payload?.file_name || "" };
  }

  const normalized = url.startsWith("/") ? url : `/${url}`;
  return {
    url: `${window.API}${normalized}`,
    fileName: payload?.file_name || ""
  };
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

UserReading.saveResultCard = async function () {
  const saveLabel = document.querySelector("#result-save-btn .result-action-label");
  const card = document.getElementById("reading-result-card");
  if (!card) return;

  const band = Number(card.dataset.band || 0).toFixed(1);
  const correct = Number(card.dataset.correct || 0);
  const total = Number(card.dataset.total || 40);
  const dateText = document.querySelector(".reading-result-date")?.textContent || "";
  const filename = `voxi-ielts-result-${Date.now()}.png`;

  if (saveLabel) saveLabel.textContent = "Saving...";

  try {
    const blob = await UserReading.resultCardToBlob({ band, correct, total, dateText });
    const uploaded = await UserReading.uploadResultCardImage(blob);
    const tg = window.Telegram?.WebApp;
    const remoteUrl = uploaded.url;
    const remoteName = uploaded.fileName || filename;
    let triggered = false;

    if (tg && typeof tg.downloadFile === "function") {
      try {
        tg.downloadFile({
          url: remoteUrl,
          file_name: remoteName
        });
        triggered = true;
      } catch (error) {
        console.error("Telegram downloadFile failed:", error);
      }
    }

    if (!triggered) {
      const link = document.createElement("a");
      link.href = remoteUrl;
      link.download = remoteName;
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggered = true;
    }

    if (triggered) {
      UserReading.showResultBadge("Saved!", "success");
      return;
    }

    throw new Error("Save trigger failed");
  } catch (error) {
    console.error("Failed to save result card:", error);
    UserReading.showResultBadge("Save failed", "error");
  } finally {
    if (saveLabel) saveLabel.textContent = "Save";
  }
};
