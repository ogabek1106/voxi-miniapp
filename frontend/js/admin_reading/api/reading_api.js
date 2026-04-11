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
    const passageBlocks = document.querySelectorAll(".passage-block");
    // 🔴 PRE-VALIDATION (BEFORE ANY DELETE)
    for (let pi = 0; pi < passageBlocks.length; pi++) {
      const p = passageBlocks[pi];

      const questions = p.querySelector(".questions-wrap")
        .querySelectorAll(".question-block");

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const type = q.querySelector(".q-type-select")?.value;

        if (type === "gap") {
          const text = q.querySelector(".gap-text")?.value?.trim() || "";
          const blanks = AdminReading.Gap.detectBlanks(text);

          const answerBlocks = q.querySelectorAll(".gap-answer-block");

          const answers = Array.from(answerBlocks).map(block => {
            return Array.from(block.querySelectorAll(".gap-answer-input"))
              .map(i => i.value.trim())
              .filter(Boolean);
          });

          if (answers.length !== blanks.length) {
            alert(`❌ Gap mismatch: ${blanks.length} blanks but ${answers.length} answer groups`);
  
            if (btn) {
              btn.disabled = false;
              btn.innerText = "💾 Save Draft";
            }

            return;
          }
        }
      }
    }
   
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
      let groupCounter = 1;
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        console.log("---- QUESTION BLOCK ----");
        console.log(q);

        const type = q.querySelector(".q-type-select")?.value || "matching";
       

        console.log("type:", type);
        

        // const type = typeEl?.value;
        if (type === "matching") {
          const groupId = groupCounter++;
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
              question_group_id: groupId,
              instruction: null,
              content: { text: qText },
              correct_answer: { value: answer },
              meta: { options: options },
              points: 1
            });

          }

          continue;
        }
        if (type === "paragraph_matching") {
          const groupId = groupCounter++;
          const payload = AdminReading.serializeParagraphMatching(q, groupId, orderCursor);

          if (!payload || !payload.length) continue;

          for (const item of payload) {
            await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
          }

          orderCursor += payload.length;

          continue;
        }
        if (type === "single_choice") {

          const optionInputs = q.querySelectorAll(".mcq-option-input");

          const options = Array.from(optionInputs)
            .map(o => o.value.trim())
            .filter(Boolean);

          const correct = q.querySelector(".mcq-correct")?.value || "A";

          const questionText =
            q.querySelector(".mcq-question")?.value?.trim() || "";

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "SINGLE_CHOICE",
            order_index: orderCursor++,
            instruction: null,
            content: { text: questionText },
            correct_answer: { value: correct },
            meta: { options },
            points: 1
          });

          continue;
        }

        if (type === "multiple_choice") {

          const questionText =
            q.querySelector(".mcq-question")?.value?.trim() || "";

          if (!questionText) continue;

          const maxAnswers = parseInt(
            q.querySelector(".mcq-max")?.value || "1",
            10
          );

          const optionEls = q.querySelectorAll(".mcq-option");

          const options = [];
          const correct_answers = [];

          optionEls.forEach((el, index) => {
            const key = String.fromCharCode(65 + index);

            const text = el.querySelector(".mcq-option-text")?.value?.trim();

            if (!text) return;

            options.push({ key, text });

            if (el.querySelector(".mcq-correct")?.checked) {
              correct_answers.push(key);
            }
          });

          if (!options.length) continue;
          if (!correct_answers.length) continue;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "MULTI_CHOICE",
            order_index: orderCursor++,
            instruction: null,
            content: {
              text: questionText,
              options: options
            },
            correct_answer: {
              value: correct_answers
            },
            meta: {
              max_answers: maxAnswers
            },
            points: 1
          });

          continue;
        }
        
        if (type === "yes_no_ng") {

          const questionText =
            q.querySelector(".ynng-question")?.value?.trim() || "";

          const correct =
            q.querySelector(".ynng-correct")?.value || "YES";

          if (!questionText) continue;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "YES_NO_NG",
            order_index: orderCursor++,
            instruction: null,
            content: { text: questionText },
            correct_answer: { value: correct },
            meta: { subtype: "YN" },
            points: 1
          });

          continue;
        }

        if (type === "tf_ng") {

          const payload = AdminReading.serializeTFNG(q);

          if (!payload) continue;

          const imageWrap = q.querySelector(".image-attach-wrap");
          const imageUrl = imageWrap?.dataset.imageUrl || null;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            ...payload,
            order_index: orderCursor++,
            instruction: null,
            image_url: imageUrl,
            points: 1
          });

          continue;
        }
        
        if (type === "gap") {

          const groupId = groupCounter++;

          const text = q.querySelector(".gap-text")?.value?.trim() || "";

          // 🔹 detect blanks
          const blanks = AdminReading.Gap.detectBlanks(text);

          // 🔹 collect answers
          const answerBlocks = q.querySelectorAll(".gap-answer-block");

          const answers = Array.from(answerBlocks).map(block => {
            return Array.from(block.querySelectorAll(".gap-answer-input"))
              .map(i => i.value.trim())
              .filter(Boolean);
          });

  
          // 🔥 CREATE ONE QUESTION PER BLANK
          for (let i = 0; i < blanks.length; i++) {

            const variants = answers[i];

            if (!variants.length) continue;

            const correct = variants[0]; // first = main correct

            await apiPost(`/admin/reading/passages/${passageId}/questions`, {
              type: "TEXT_INPUT",
              order_index: orderCursor++,
              question_group_id: groupId,
              instruction: null,
              content: { text: text },
              correct_answer: { value: correct },
              meta: { variants: variants },
              points: 1
            });
          }

          continue;
        }
        if (type === "summary") {

  const groupId = groupCounter++;
  const payload = AdminReading.serializeSummary(q, groupId, orderCursor);

  if (!payload || !payload.length) continue;

  for (const item of payload) {
    await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
  }

  orderCursor += payload.length;

  continue;
}
        console.log("🧪 Creating question", qi + 1, "for passage", pi + 1);
        
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

window.publishReading = async function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  if (!title) {
    alert("Reading name is required");
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

      for (const p of old.passages || []) {
        try {
          await apiDelete(`/admin/reading/passages/${p.id}`);
        } catch (e) {
          console.warn("Skip delete passage", p.id, e);
        }
      }

      testId = window.__currentEditingTestId;
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });

      testId = test.id;
      window.__currentEditingTestId = testId; // 🔒 ensure id is set after first publish
    }

    const passageBlocks = document.querySelectorAll(".passage-block");

    for (let pi = 0; pi < passageBlocks.length; pi++) {
      const p = passageBlocks[pi];

      const passageTitle = p.querySelector(".passage-title")?.value || null;
      const passageText = p.querySelector(".passage-text")?.value || "";

      const imageWrap = p.querySelector(".image-attach-wrap");
      const imageUrl = imageWrap?.dataset.imageUrl || null;

      const passage = await apiPost(`/admin/reading/tests/${testId}/passages`, {
        title: passageTitle,
        text: passageText,
        image_url: imageUrl,
        order_index: pi + 1
      });

      const passageId = passage.id;

      const questions = p.querySelector(".questions-wrap").querySelectorAll(".question-block");
      let orderCursor = 1;
      let groupCounter = 1;
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        const type = q.querySelector(".q-type-select")?.value;
        if (type === "matching") {
          const groupId = groupCounter++;
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
              question_group_id: groupId,
              instruction: null,
              content: { text: qText },
              correct_answer: { value: answer },
              meta: { options: options },
              points: 1
            });

          }

          continue;
        }
        if (type === "paragraph_matching") {
          const groupId = groupCounter++;
          const payload = AdminReading.serializeParagraphMatching(q, groupId, orderCursor);

          if (!payload || !payload.length) continue;

          for (const item of payload) {
            await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
          }

          orderCursor += payload.length;

          continue;
        }
        if (type === "single_choice") {

          const optionInputs = q.querySelectorAll(".mcq-option-input");

          const options = Array.from(optionInputs)
            .map(o => o.value.trim())
            .filter(Boolean);

          const correct = q.querySelector(".mcq-correct")?.value || "A";

          const questionText =
            q.querySelector(".mcq-question")?.value?.trim() || "";

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "SINGLE_CHOICE",
            order_index: orderCursor++,
            instruction: null,
            content: { text: questionText },
            correct_answer: { value: correct },
            meta: { options },
            points: 1
          });

          continue;
        }

        if (type === "multiple_choice") {

  const questionText =
    q.querySelector(".mcq-question")?.value?.trim() || "";

  if (!questionText) continue;

  const maxAnswers = parseInt(
    q.querySelector(".mcq-max")?.value || "1",
    10
  );

  const optionEls = q.querySelectorAll(".mcq-option");

  const options = [];
  const correct_answers = [];

  optionEls.forEach((el, index) => {
    const key = String.fromCharCode(65 + index);

    const text = el.querySelector(".mcq-option-text")?.value?.trim();
    if (!text) return;

    options.push({ key, text });

    if (el.querySelector(".mcq-correct")?.checked) {
      correct_answers.push(key);
    }
  });

  if (!options.length) continue;
  if (!correct_answers.length) continue;

  await apiPost(`/admin/reading/passages/${passageId}/questions`, {
    type: "MULTI_CHOICE",
    order_index: orderCursor++,
    instruction: null,
    content: {
      text: questionText,
      options: options
    },
    correct_answer: {
      value: correct_answers
    },
    meta: {
      max_answers: maxAnswers
    },
    points: 1
  });

  continue;
}

        if (type === "yes_no_ng") {

          const questionText =
            q.querySelector(".ynng-question")?.value?.trim() || "";

          const correct =
            q.querySelector(".ynng-correct")?.value || "YES";

          if (!questionText) continue;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "YES_NO_NG",
            order_index: orderCursor++,
            instruction: null,
            content: { text: questionText },
            correct_answer: { value: correct },
            meta: { subtype: "YN" },
            points: 1
          });

          continue;
        }

        if (type === "tf_ng") {

          const payload = AdminReading.serializeTFNG(q);

          if (!payload) continue;

          const imageWrap = q.querySelector(".image-attach-wrap");
          const imageUrl = imageWrap?.dataset.imageUrl || null;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            ...payload,
            order_index: orderCursor++,
            instruction: null,
            image_url: imageUrl,
            points: 1
          });

          continue;
        }

        if (type === "gap") {

          const groupId = groupCounter++;
          const text = q.querySelector(".gap-text")?.value?.trim() || "";
          const blanks = AdminReading.Gap.detectBlanks(text);
          const answerBlocks = q.querySelectorAll(".gap-answer-block");

          const answers = Array.from(answerBlocks).map(block => {
            return Array.from(block.querySelectorAll(".gap-answer-input"))
              .map(i => i.value.trim())
              .filter(Boolean);
          });

          for (let i = 0; i < blanks.length; i++) {
            const variants = answers[i];

            if (!variants.length) continue;

            await apiPost(`/admin/reading/passages/${passageId}/questions`, {
              type: "TEXT_INPUT",
              order_index: orderCursor++,
              question_group_id: groupId,
              instruction: null,
              content: { text: text },
              correct_answer: { value: variants[0] },
              meta: { variants: variants },
              points: 1
            });
          }

          continue;
        }

        if (type === "summary") {

  const groupId = groupCounter++;
  const payload = AdminReading.serializeSummary(q, groupId, orderCursor);

  if (!payload || !payload.length) continue;

  for (const item of payload) {
    await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
  }

  orderCursor += payload.length;

  continue;
}
        
        const text = q.querySelector(".q-text")?.value;
        const correctAnswer = q.querySelector(".q-answer")?.value;
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

    // 🚀 Publish
    await apiPost(`/admin/reading/tests/${testId}/publish`);

    alert("🚀 Reading test published");
    showAdminReadingList();
  } catch (e) {
    console.error(e);
    alert("❌ Failed to publish reading test");
  }
};

window.unpublishReading = async function (testId) {
  const ok = confirm("Are you sure you want to unpublish this test?\nIt will move back to Drafts.");
  if (!ok) return;

  try {
    await apiPost(`/admin/reading/tests/${testId}/unpublish`);
    alert("↩️ Reading test unpublished");
    showAdminReadingList();
  } catch (e) {
    console.error("❌ UNPUBLISH ERROR:", e);
    alert("❌ Failed to unpublish reading test\n" + (e.message || ""));
  }
};

window.deleteReadingTest = async function (testId) {
  const ok = confirm("❌ Are you sure you want to DELETE this reading test?\nThis cannot be undone.");
  if (!ok) return;

  try {
    await apiDelete(`/admin/reading/tests/${testId}`);
    alert("🗑 Reading test deleted");
    loadAdminReadingList();
  } catch (e) {
    console.error("❌ DELETE TEST ERROR:", e);
    alert("❌ Failed to delete reading test\n" + (e.message || ""));
  }
};
