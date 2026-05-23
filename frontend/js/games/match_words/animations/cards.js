window.MatchWordsAnimations = window.MatchWordsAnimations || {};

(function () {
  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function card(uid, side) {
    return document.querySelector(`.match-word-card[data-uid="${cssEscape(uid)}"][data-side="${side}"]`);
  }

  function clearState(el) {
    if (!el) return;
    el.classList.remove("is-correct", "is-wrong", "is-selected");
  }

  MatchWordsAnimations.tapGlow = function (event) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--tap-x", `${Math.max(0, Math.min(100, x))}%`);
    el.style.setProperty("--tap-y", `${Math.max(0, Math.min(100, y))}%`);
  };

  MatchWordsAnimations.correctPair = function (uid, done) {
    const left = card(uid, "english");
    const right = card(uid, "translation");
    left?.classList.add("is-correct");
    right?.classList.add("is-correct");
    setTimeout(() => {
      left?.classList.add("is-removing");
      right?.classList.add("is-removing");
      MatchWordsState.markRemoving(uid);
    }, 210);
    setTimeout(() => {
      done?.();
    }, 760);
  };

  MatchWordsAnimations.enterPair = function (uid) {
    requestAnimationFrame(() => {
      card(uid, "english")?.classList.add("is-entering");
      card(uid, "translation")?.classList.add("is-entering");
      setTimeout(() => {
        card(uid, "english")?.classList.remove("is-entering");
        card(uid, "translation")?.classList.remove("is-entering");
        MatchWordsState.markEntered();
      }, 440);
    });
  };

  MatchWordsAnimations.wrongPair = function (englishUid, translationUid) {
    const left = card(englishUid, "english");
    const right = card(translationUid, "translation");
    left?.classList.add("is-wrong");
    right?.classList.add("is-wrong");
    if (navigator.vibrate) navigator.vibrate(35);
    setTimeout(() => {
      clearState(left);
      clearState(right);
    }, 390);
  };

  MatchWordsAnimations.timeFloat = function (amount) {
    const host = document.getElementById("match-words-floats");
    if (!host) return;
    const el = document.createElement("div");
    el.className = `match-words-float ${amount < 0 ? "is-bad" : "is-good"}`;
    el.textContent = `${amount > 0 ? "+" : ""}${amount} sec`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 720);
  };
})();
