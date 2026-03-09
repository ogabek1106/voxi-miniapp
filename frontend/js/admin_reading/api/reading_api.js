// frontend/js/admin_reading/api/reading_api.js
window.AdminReading = window.AdminReading || {};
window.collectReadingFormData = function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  const passages = [];
  document.querySelectorAll(".passage-block").forEach((p, pi) => {
    const passageTitle = p.querySelector(".passage-title")?.value || null;
    const passageText = p.querySelector(".passage-text")?.value || "";

    const questions = [];
    p.querySelectorAll(".question-block").forEach((q, qi) => {
      questions.push({
        type: q.querySelector(".q-type")?.value,
        text: q.querySelector(".q-text")?.value,
        correct_answer: q.querySelector(".q-answer")?.value,
        order_index: qi + 1,
      });
    });

    passages.push({
      title: passageTitle,
      text: passageText,
      order_index: pi + 1,
      questions,
    });
  });

  return { title, time_limit_minutes: time, passages };
};

window.saveReadingDraft = async function () {
  const btn = document.getElementById("btn-save-draft");
  if (btn) {
    if (btn.disabled) return;         // prevent double click
    btn.disabled = true;
    btn.innerText = "⏳ Saving...";
  }
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  if (!title) {
    alert("Reading name is required");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }
    return;
  }
  try {
   
    let testId;
    console.log("🧪 Save draft started");
    if (window.__currentEditingTestId) {
      await apiPut(`/admin/reading/tests/${window.__currentEditingTestId}`, {
        title,
        time_limit_minutes: time
      });

      const old = await apiGet(`/admin/reading/tests/${window.__currentEditingTestId}`);

      const deletions = (old.passages || []).map(p =>
        apiDelete(`/admin/reading/passages/${p.id}`)
      );

      await Promise.all(deletions);

      testId = window.__currentEditingTestId;
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });
      testId = test.id;
      window.__currentEditingTestId = testId;
    }

    // 2) Create passages
    const passageBlocks = document.querySelectorAll(".passage-block");

    for (let pi = 0; pi < passageBlocks.length; pi++) {
      const p = passageBlocks[pi];

      const passageTitle = p.querySelector(".passage-title")?.value || null;
      const passageText = p.querySelector(".passage-text")?.value || "";

      if (!passageText.trim()) {
        alert(`Passage ${pi + 1} text is empty`);
        if (btn) {
          btn.disabled = false;
          btn.innerText = "💾 Save Draft";
        }
        return;
      }
      console.log("🧪 Creating passage", pi + 1);
      const imageWrap = p.querySelector(".image-attach-wrap");
      const imageUrl = imageWrap?.dataset.imageUrl || null;

      const passage = await apiPost(`/admin/reading/tests/${testId}/passages`, {
        title: passageTitle,
        text: passageText,
        image_url: imageUrl,
        order_index: pi + 1
      });
      const passageId = passage.id;

      // 3) Create questions for this passage
      const questions = p.querySelector(".questions-wrap").querySelectorAll(".question-block");
      let orderCursor = 1;
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        console.log("---- QUESTION BLOCK ----");
        console.log(q);

        const typeEl = q.querySelector(".q-type");
        const textEl = q.querySelector(".q-text");
        const answerEl = q.querySelector(".q-answer");

        console.log("typeEl:", typeEl);
        console.log("textEl:", textEl);
        console.log("answerEl:", answerEl);

        const type = typeEl?.value;
        if (type === "matching") {

          const options = Array.from(q.querySelectorAll(".match-option"))
            .map(o => o.value.trim())
            .filter(Boolean);

          const matchQuestions = q.querySelectorAll(".match-question");

          for (let i = 0; i < matchQuestions.length; i++) {

            const qText = matchQuestions[i].value?.trim();
            if (!qText) continue;

            const answer = q.querySelectorAll(".match-answer")[i].value;

            await apiPost(`/admin/reading/passages/${passageId}/questions`, {
              type: "MATCHING",
              order_index: orderCursor++,
              instruction: null,
              content: { text: qText },
              correct_answer: { value: answer },
              meta: { options: options },
              points: 1
            });

          }

          continue;
        }
        const text = textEl?.value;
        const correctAnswer = answerEl?.value;

        console.log("READ VALUES:", { type, text, correctAnswer });

        if (!text?.trim()) {
          console.warn(`Skipping empty question ${qi + 1}`);
          continue; // skip empty questions
        }
         
        console.log("🧪 Creating question", qi + 1, "for passage", pi + 1);
        let meta = null;

        if (type === "gap") {
          const maxWords = q.querySelector(".q-max-words")?.value;
          const allowNumbers = q.querySelector(".q-allow-numbers")?.checked;

          meta = {
            max_words: maxWords ? parseInt(maxWords) : null,
            allow_numbers: !!allowNumbers
          };
        }
        const imageWrap = q.querySelector(".image-attach-wrap");
        const imageUrl = imageWrap?.dataset.imageUrl || null;

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          type: mapType(type),
          order_index: orderCursor++,
          instruction: null,
          content: { text: text },
          correct_answer: { value: correctAnswer },
          image_url: imageUrl,
          meta: meta,
          explanation: null,
          points: 1
        });
      }
    }

    alert("✅ Reading saved");
    openAdminReading(testId);
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }

  } catch (e) {
    console.error("❌ SAVE DRAFT ERROR FULL:", e);

    if (e?.response) {
      console.error("Status:", e.response.status);
      console.error("Data:", e.response.data);

      alert(
        "❌ Failed to save reading test\n" +
        "Status: " + e.response.status + "\n" +
        JSON.stringify(e.response.data, null, 2)
      );
    } else {
      alert("❌ Failed to save reading test\n" + e.message);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }
  }
};
