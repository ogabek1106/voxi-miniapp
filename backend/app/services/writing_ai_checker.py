import json
import os
import base64
from pathlib import Path
from typing import Any, Dict, List

from fastapi import HTTPException
from openai import OpenAI


SYSTEM_PROMPT = """You are a certified IELTS Writing examiner.
You strictly follow official IELTS public band descriptors.

Your task is to assign an accurate band score.

Rules:
- Be strict and realistic. Do not be generous.
- Do not reward memorized or generic responses.
- Penalize off-topic answers.
- Penalize underdeveloped ideas.
- Penalize weak coherence.
- Penalize grammar errors appropriately.
- Penalize limited vocabulary.
- If response is under required word count, reduce score significantly.
- If response is irrelevant, give low band (<=4.0).
- Use full band scale: 0.0 to 9.0 in 0.5 steps.

Do NOT explain.
Do NOT justify.
Do NOT give feedback.

Return ONLY valid JSON."""


TASK1_CRITERIA = [
    "task_achievement",
    "coherence_and_cohesion",
    "lexical_resource",
    "grammatical_range_and_accuracy",
]

TASK2_CRITERIA = [
    "task_response",
    "coherence_and_cohesion",
    "lexical_resource",
    "grammatical_range_and_accuracy",
]


def round_band(value: float) -> float:
    clamped = max(0.0, min(9.0, float(value)))
    return round(clamped * 2) / 2.0


def _is_valid_band(value: Any) -> bool:
    if not isinstance(value, (int, float)):
        return False
    numeric = float(value)
    if numeric < 0.0 or numeric > 9.0:
        return False
    doubled = numeric * 2.0
    return abs(doubled - round(doubled)) < 1e-9


def _build_task_schema(task_number: int) -> Dict[str, Any]:
    criteria_keys = TASK1_CRITERIA if int(task_number) == 1 else TASK2_CRITERIA
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "task_number": {"type": "integer", "enum": [int(task_number)]},
            "overall_band": {"type": "number"},
            "criteria": {
                "type": "object",
                "additionalProperties": False,
                "properties": {key: {"type": "number"} for key in criteria_keys},
                "required": criteria_keys
            }
        },
        "required": ["task_number", "overall_band", "criteria"]
    }


def build_prompt(task_number: int, instruction: str, question: str, answer_text: str) -> str:
    task_type = "Academic Writing Task 1" if int(task_number) == 1 else "Academic Writing Task 2"
    criteria_label = (
        "- Task Achievement\n- Coherence and Cohesion\n- Lexical Resource\n- Grammatical Range and Accuracy"
        if int(task_number) == 1
        else "- Task Response\n- Coherence and Cohesion\n- Lexical Resource\n- Grammatical Range and Accuracy"
    )

    response_example = (
        """{
  "task_number": 1,
  "overall_band": number,
  "criteria": {
    "task_achievement": number,
    "coherence_and_cohesion": number,
    "lexical_resource": number,
    "grammatical_range_and_accuracy": number
  }
}"""
        if int(task_number) == 1
        else """{
  "task_number": 2,
  "overall_band": number,
  "criteria": {
    "task_response": number,
    "coherence_and_cohesion": number,
    "lexical_resource": number,
    "grammatical_range_and_accuracy": number
  }
}"""
    )

    return (
        f"Task Type: {task_type}\n\n"
        f"Instruction:\n{(instruction or '').strip()} {(question or '').strip()}\n\n"
        f"Candidate Response:\n{(answer_text or '').strip()}\n\n"
        f"Score using these criteria:\n{criteria_label}\n\n"
        f"Return JSON:\n\n{response_example}"
    )


def _extract_output_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    output = getattr(response, "output", None) or []
    chunks: List[str] = []
    for item in output:
        content = getattr(item, "content", None) or []
        for part in content:
            text_value = getattr(part, "text", None)
            if isinstance(text_value, str) and text_value.strip():
                chunks.append(text_value.strip())
    return "\n".join(chunks).strip()


def _resolve_media_file_path(image_url: str) -> Path | None:
    raw = str(image_url or "").strip()
    if not raw:
        return None

    # Expected stored form: /media/<filename>
    if raw.startswith("/media/"):
        file_name = raw.replace("/media/", "", 1).strip()
        if not file_name:
            return None
        return Path("/data/media") / file_name

    # Fallback: when only file name is stored
    if "/" not in raw:
        return Path("/data/media") / raw

    return None


def _file_to_data_url(path: Path) -> str:
    suffix = path.suffix.lower()
    mime = "image/jpeg"
    if suffix == ".png":
        mime = "image/png"
    elif suffix == ".webp":
        mime = "image/webp"
    elif suffix == ".gif":
        mime = "image/gif"

    with path.open("rb") as fh:
        encoded = base64.b64encode(fh.read()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def call_openai(task_number: int, user_prompt: str) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_WRITING_MODEL", "").strip() or "gpt-4o-mini"
    temperature = float(os.getenv("OPENAI_WRITING_TEMPERATURE", 0.2))

    client = OpenAI(api_key=api_key)
    schema = _build_task_schema(task_number)

    response = client.responses.create(
        model=model,
        temperature=temperature,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": f"ielts_writing_task_{int(task_number)}_score",
                "strict": True,
                "schema": schema,
            }
        },
    )

    raw_text = _extract_output_text(response)
    if not raw_text:
        raise ValueError("Empty AI response")
    return json.loads(raw_text)


def _ocr_image_text(image_url: str) -> str:
    file_path = _resolve_media_file_path(image_url)
    if not file_path or not file_path.exists() or not file_path.is_file():
        return ""

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_WRITING_MODEL", "").strip() or "gpt-4o-mini"
    client = OpenAI(api_key=api_key)
    data_url = _file_to_data_url(file_path)

    response = client.responses.create(
        model=model,
        temperature=0,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Extract all readable text from this IELTS Writing answer image. "
                            "Return ONLY plain extracted text. "
                            "No explanation, no markdown, no labels."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": data_url,
                    },
                ],
            }
        ],
    )

    return _extract_output_text(response).strip()


def _merge_answer_sources(answer_text: str, image_url: str | None) -> str:
    typed = str(answer_text or "").strip()
    ocr_text = _ocr_image_text(image_url or "").strip() if image_url else ""

    if typed and ocr_text:
        return f"{typed}\n\n{ocr_text}".strip()
    if typed:
        return typed
    return ocr_text


def parse_and_validate(task_number: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("AI response is not an object")

    if int(payload.get("task_number", -1)) != int(task_number):
        raise ValueError("Invalid task_number")

    overall_band = payload.get("overall_band")
    if not _is_valid_band(overall_band):
        raise ValueError("Invalid overall_band")

    criteria = payload.get("criteria")
    if not isinstance(criteria, dict):
        raise ValueError("Missing criteria")

    keys = TASK1_CRITERIA if int(task_number) == 1 else TASK2_CRITERIA
    for key in keys:
        if key not in criteria:
            raise ValueError(f"Missing criteria.{key}")
        if not _is_valid_band(criteria[key]):
            raise ValueError(f"Invalid criteria.{key}")

    return {
        "task_number": int(task_number),
        "overall_band": round_band(float(overall_band)),
        "criteria": {key: round_band(float(criteria[key])) for key in keys},
    }


def check_task(task_number: int, instruction: str, question: str, answer_text: str, image_url: str | None = None) -> Dict[str, Any]:
    combined_answer = _merge_answer_sources(answer_text, image_url)
    prompt = build_prompt(task_number, instruction, question, answer_text)
    if combined_answer != answer_text:
        prompt = build_prompt(task_number, instruction, question, combined_answer)

    first_error = None
    for _ in range(2):  # retry once on invalid response
        try:
            raw = call_openai(task_number, prompt)
            return parse_and_validate(task_number, raw)
        except Exception as exc:  # noqa: BLE001
            first_error = exc

    raise HTTPException(status_code=502, detail=f"AI scoring failed for task {task_number}: {first_error}")


def check_writing_progress(db, progress, tasks: List[Any]) -> Dict[str, Any]:
    task_map = {int(getattr(t, "task_number", 0)): t for t in tasks}
    task1 = task_map.get(1)
    task2 = task_map.get(2)
    if not task1 or not task2:
        raise HTTPException(status_code=422, detail="Writing tasks 1 and 2 are required")

    task1_result = check_task(
        1,
        getattr(task1, "instruction_template", "") or "",
        getattr(task1, "question_text", "") or "",
        getattr(progress, "task1_text", "") or "",
        getattr(progress, "task1_image_url", None),
    )
    task2_result = check_task(
        2,
        getattr(task2, "instruction_template", "") or "",
        getattr(task2, "question_text", "") or "",
        getattr(progress, "task2_text", "") or "",
        getattr(progress, "task2_image_url", None),
    )

    final_band = round_band((task1_result["overall_band"] + task2_result["overall_band"] * 2.0) / 3.0)

    return {
        "overall_writing_band": final_band,
        "task1": task1_result,
        "task2": task2_result,
    }
