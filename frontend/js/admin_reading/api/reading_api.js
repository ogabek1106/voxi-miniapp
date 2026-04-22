// frontend/js/admin_reading/api/reading_api.js
window.AdminReading = window.AdminReading || {};

window.collectReadingFormData = function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  const passages = [];
  document.querySelectorAll(".passage-block").forEach((passageBlock, passageIndex) => {
    passages.push({
      title: passageBlock.querySelector(".passage-title")?.value || null,
      text: passageBlock.querySelector(".passage-text")?.value || "",
      order_index: passageIndex + 1,
      questions: Array.from(passageBlock.querySelectorAll(".question-block")).map((block, questionIndex) => ({
        type: block.querySelector(".q-type-select")?.value || "",
        order_index: questionIndex + 1
      }))
    });
  });

  return { title, time_limit_minutes: time, passages };
};

window.validateReadingEditor = function () {
  const passageBlocks = document.querySelectorAll(".passage-block");
  for (let pi = 0; pi < passageBlocks.length; pi++) {
    const passage = passageBlocks[pi];
    const passageText = passage.querySelector(".passage-text")?.value?.trim() || "";
    if (!passageText) {
      throw new Error(`Passage ${pi + 1} text is empty`);
    }

    const questionBlocks = passage.querySelectorAll(".question-block");
    for (let qi = 0; qi < questionBlocks.length; qi++) {
      const block = questionBlocks[qi];
      const type = block.querySelector(".q-type-select")?.value || "";

      if (type === "gap") {
        const text = block.querySelector(".gap-text")?.value?.trim() || "";
        const blanks = AdminReading.Gap.detectBlanks(text);
        const answerBlocks = block.querySelectorAll(".gap-answer-block");
        const answers = Array.from(answerBlocks).map((answerBlock) =>
          Array.from(answerBlock.querySelectorAll(".gap-answer-input"))
            .map((input) => input.value.trim())
            .filter(Boolean)
        );

        if (answers.length !== blanks.length) {
          throw new Error(`Gap mismatch in passage ${pi + 1}: ${blanks.length} blanks but ${answers.length} answer groups`);
        }
      }
    }
  }
};

window.createPassagesAndQuestions = async function (testId) {
  const passageBlocks = document.querySelectorAll(".passage-block");

  for (let pi = 0; pi < passageBlocks.length; pi++) {
    const passageBlock = passageBlocks[pi];
    const passageTitle = passageBlock.querySelector(".passage-title")?.value || null;
    const passageText = passageBlock.querySelector(".passage-text")?.value || "";

    const createdPassage = await apiPost(`/admin/reading/tests/${testId}/passages`, {
      title: passageTitle,
      text: passageText,
      image_url: null,
      order_index: pi + 1
    });

    const passageId = createdPassage.id;
    let orderCursor = 1;
    let groupCounter = 1;

    const blocks = passageBlock.querySelectorAll(".question-block");
    for (let qi = 0; qi < blocks.length; qi++) {
      const block = blocks[qi];
      const type = block.querySelector(".q-type-select")?.value || "matching";
      const instruction =
        (window.getInstructionValueFromBlock
          ? window.getInstructionValueFromBlock(block)
          : block.querySelector(".q-instruction-select")?.value?.trim()) || null;

      if (type === "matching") {
        const groupId = groupCounter++;
        const options = Array.from(block.querySelectorAll(".match-option"))
          .map((option) => option.value.trim())
          .filter(Boolean);

        const questionInputs = block.querySelectorAll(".match-question");
        const answerSelects = block.querySelectorAll(".match-answer");

        for (let i = 0; i < questionInputs.length; i++) {
          const text = questionInputs[i].value?.trim();
          if (!text) continue;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "MATCHING",
            order_index: orderCursor++,
            question_group_id: groupId,
            instruction,
            content: { text },
            correct_answer: { value: answerSelects[i]?.value || "A" },
            meta: { options },
            points: 1
          });
        }
        continue;
      }

      if (type === "paragraph_matching") {
        const groupId = groupCounter++;
        const payload = AdminReading.serializeParagraphMatching(block, groupId, orderCursor);
        if (!payload || !payload.length) continue;

        for (const item of payload) {
          await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
        }
        orderCursor += payload.length;
        continue;
      }

      if (type === "single_choice") {
        const options = Array.from(block.querySelectorAll(".mcq-option-input"))
          .map((option) => option.value.trim())
          .filter(Boolean);
        const questionText = block.querySelector(".mcq-question")?.value?.trim() || "";
        if (!questionText) continue;

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          type: "SINGLE_CHOICE",
          order_index: orderCursor++,
          instruction,
          content: { text: questionText },
          correct_answer: { value: block.querySelector(".mcq-correct")?.value || "A" },
          meta: { options },
          points: 1
        });
        continue;
      }

      if (type === "multiple_choice") {
        const questionText = block.querySelector(".mcq-question")?.value?.trim() || "";
        if (!questionText) continue;

        const optionEls = block.querySelectorAll(".mcq-option");
        const options = [];
        const correct = [];

        optionEls.forEach((optionEl, index) => {
          const key = String.fromCharCode(65 + index);
          const text = optionEl.querySelector(".mcq-option-text")?.value?.trim();
          if (!text) return;
          options.push({ key, text });
          if (optionEl.querySelector(".mcq-correct")?.checked) {
            correct.push(key);
          }
        });

        if (!options.length || !correct.length) continue;

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          type: "MULTI_CHOICE",
          order_index: orderCursor++,
          instruction,
          content: { text: questionText, options },
          correct_answer: { value: correct },
          meta: { max_answers: parseInt(block.querySelector(".mcq-max")?.value || "1", 10) },
          points: 1
        });
        continue;
      }

      if (type === "yes_no_ng") {
        const questionText = block.querySelector(".ynng-question")?.value?.trim() || "";
        if (!questionText) continue;

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          type: "YES_NO_NG",
          order_index: orderCursor++,
          instruction,
          content: { text: questionText },
          correct_answer: { value: block.querySelector(".ynng-correct")?.value || "YES" },
          meta: { subtype: "YN" },
          points: 1
        });
        continue;
      }

      if (type === "tf_ng") {
        const payload = AdminReading.serializeTFNG(block);
        if (!payload) continue;

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          ...payload,
          order_index: orderCursor++,
          instruction,
          points: 1
        });
        continue;
      }

      if (type === "gap") {
        const groupId = groupCounter++;
        const text = block.querySelector(".gap-text")?.value?.trim() || "";
        const blanks = AdminReading.Gap.detectBlanks(text);
        const answerBlocks = block.querySelectorAll(".gap-answer-block");

        const answers = Array.from(answerBlocks).map((answerBlock) =>
          Array.from(answerBlock.querySelectorAll(".gap-answer-input"))
            .map((input) => input.value.trim())
            .filter(Boolean)
        );

        for (let i = 0; i < blanks.length; i++) {
          const variants = answers[i] || [];
          if (!variants.length) continue;

          await apiPost(`/admin/reading/passages/${passageId}/questions`, {
            type: "TEXT_INPUT",
            order_index: orderCursor++,
            question_group_id: groupId,
            instruction,
            content: { text },
            correct_answer: { value: variants[0] },
            meta: { variants },
            points: 1
          });
        }
        continue;
      }

      if (type === "summary") {
        const groupId = groupCounter++;
        const payload = AdminReading.serializeSummary(block, groupId, orderCursor);
        if (!payload || !payload.length) continue;

        for (const item of payload) {
          await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
        }
        orderCursor += payload.length;
        continue;
      }

      if (type === "image_questions") {
        const groupId = groupCounter++;
        const payload = AdminReading.serializeImageQuestions(block, groupId, orderCursor);
        if (!payload || !payload.length) continue;

        for (const item of payload) {
          await apiPost(`/admin/reading/passages/${passageId}/questions`, item);
        }
        orderCursor += payload.length;
      }
    }
  }
};

window.saveReadingDraft = async function () {
  const btn = document.getElementById("btn-save-draft");
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerText = "⏳ Saving...";
  }

  try {
    const title = document.getElementById("reading-title")?.value?.trim();
    const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);
    if (!title) throw new Error("Reading name is required");

    validateReadingEditor();

    let testId = window.__currentEditingTestId;
    if (testId) {
      await apiPut(`/admin/reading/tests/${testId}`, {
        title,
        time_limit_minutes: time
      });

      const old = await apiGet(`/admin/reading/tests/${testId}`);
      await Promise.all((old.passages || []).map((passage) => apiDelete(`/admin/reading/passages/${passage.id}`)));
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });
      testId = test.id;
      window.__currentEditingTestId = testId;
    }

    await createPassagesAndQuestions(testId);

    alert("✅ Reading saved");
    openAdminReading(testId);
  } catch (error) {
    console.error("SAVE DRAFT ERROR:", error);
    alert(`❌ Failed to save reading test\n${error?.message || "Unknown error"}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }
  }
};

window.publishReading = async function () {
  try {
    const title = document.getElementById("reading-title")?.value?.trim();
    const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);
    if (!title) {
      alert("Reading name is required");
      return;
    }

    validateReadingEditor();

    let testId = window.__currentEditingTestId;
    if (testId) {
      await apiPut(`/admin/reading/tests/${testId}`, {
        title,
        time_limit_minutes: time
      });

      const old = await apiGet(`/admin/reading/tests/${testId}`);
      for (const passage of old.passages || []) {
        await apiDelete(`/admin/reading/passages/${passage.id}`);
      }
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });
      testId = test.id;
      window.__currentEditingTestId = testId;
    }

    await createPassagesAndQuestions(testId);
    await apiPost(`/admin/reading/tests/${testId}/publish`);

    alert("🚀 Reading test published");
    showAdminReadingList();
  } catch (error) {
    console.error("PUBLISH ERROR:", error);
    alert(`❌ Failed to publish reading test\n${error?.message || "Unknown error"}`);
  }
};

window.unpublishReading = async function (testId) {
  const ok = confirm("Are you sure you want to unpublish this test?\nIt will move back to Drafts.");
  if (!ok) return;

  try {
    await apiPost(`/admin/reading/tests/${testId}/unpublish`);
    alert("↩️ Reading test unpublished");
    showAdminReadingList();
  } catch (error) {
    console.error("UNPUBLISH ERROR:", error);
    alert(`❌ Failed to unpublish reading test\n${error?.message || ""}`);
  }
};

window.deleteReadingTest = async function (testId) {
  const ok = confirm("❌ Are you sure you want to DELETE this reading test?\nThis cannot be undone.");
  if (!ok) return;

  try {
    await apiDelete(`/admin/reading/tests/${testId}`);
    alert("🗑 Reading test deleted");
    loadAdminReadingList();
  } catch (error) {
    console.error("DELETE ERROR:", error);
    alert(`❌ Failed to delete reading test\n${error?.message || ""}`);
  }
};
