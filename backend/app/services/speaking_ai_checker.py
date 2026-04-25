import json
import os
from pathlib import Path
from typing import Any, Dict

from fastapi import HTTPException
from openai import OpenAI


SYSTEM_PROMPT = """You are a certified IELTS Speaking examiner.

You strictly follow official IELTS Speaking band descriptors.

Evaluate the candidate's speaking performance.

Criteria:
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Rules:
- Be strict and realistic
- Do not be generous
- Penalize hesitation, repetition, long pauses
- Penalize limited vocabulary
- Penalize grammar errors
- Penalize unclear pronunciation
- Reward natural flow and clarity
- Use full IELTS scale (0.0-9.0, 0.5 steps)

Do NOT give feedback.
Do NOT explain.
Return ONLY JSON."""


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


def _schema() -> Dict[str, Any]:
    criteria_keys = [
        "fluency_and_coherence",
        "lexical_resource",
        "grammatical_range_and_accuracy",
        "pronunciation",
    ]
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "overall_band": {"type": "number"},
            "criteria": {
                "type": "object",
                "additionalProperties": False,
                "properties": {key: {"type": "number"} for key in criteria_keys},
                "required": criteria_keys,
            },
        },
        "required": ["overall_band", "criteria"],
    }


def _media_path_from_url(audio_url: str) -> Path | None:
    raw = str(audio_url or "").strip()
    if not raw:
        return None
    if raw.startswith("/media/"):
        file_name = raw.replace("/media/", "", 1).strip()
        if not file_name:
            return None
        return Path("/data/media") / file_name
    if "/" not in raw:
        return Path("/data/media") / raw
    return None


def _client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
    return OpenAI(api_key=api_key)


def _extract_output_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    output = getattr(response, "output", None) or []
    chunks = []
    for item in output:
        content = getattr(item, "content", None) or []
        for part in content:
            text_value = getattr(part, "text", None)
            if isinstance(text_value, str) and text_value.strip():
                chunks.append(text_value.strip())
    return "\n".join(chunks).strip()


def transcribe_audio(audio_url: str) -> str:
    path = _media_path_from_url(audio_url)
    if not path or not path.exists() or not path.is_file():
        return ""

    client = _client()
    model = os.getenv("OPENAI_SPEAKING_TRANSCRIBE_MODEL", "").strip() or "gpt-4o-mini-transcribe"

    with path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
        )
    return str(getattr(transcript, "text", "") or "").strip()


def build_prompt(part1: str, part2: str, part3: str) -> str:
    return (
        "Part 1 transcript:\n"
        f"{(part1 or '').strip()}\n\n"
        "Part 2 transcript:\n"
        f"{(part2 or '').strip()}\n\n"
        "Part 3 transcript:\n"
        f"{(part3 or '').strip()}\n\n"
        "Return JSON:\n"
        "{\n"
        '  "overall_band": number,\n'
        '  "criteria": {\n'
        '    "fluency_and_coherence": number,\n'
        '    "lexical_resource": number,\n'
        '    "grammatical_range_and_accuracy": number,\n'
        '    "pronunciation": number\n'
        "  }\n"
        "}"
    )


def parse_and_validate(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("AI response is not an object")

    criteria = payload.get("criteria")
    if not isinstance(criteria, dict):
        raise ValueError("Missing criteria object")

    overall = payload.get("overall_band")
    if not _is_valid_band(overall):
        raise ValueError("Invalid overall band")

    needed = [
        "fluency_and_coherence",
        "lexical_resource",
        "grammatical_range_and_accuracy",
        "pronunciation",
    ]
    for key in needed:
        if key not in criteria:
            raise ValueError(f"Missing criteria.{key}")
        if not _is_valid_band(criteria.get(key)):
            raise ValueError(f"Invalid criteria.{key}")

    return {
        "overall_band": round_band(float(overall)),
        "criteria": {
            "fluency_and_coherence": round_band(float(criteria["fluency_and_coherence"])),
            "lexical_resource": round_band(float(criteria["lexical_resource"])),
            "grammatical_range_and_accuracy": round_band(float(criteria["grammatical_range_and_accuracy"])),
            "pronunciation": round_band(float(criteria["pronunciation"])),
        },
    }


def call_openai(prompt: str) -> Dict[str, Any]:
    client = _client()
    model = os.getenv("OPENAI_WRITING_MODEL", "").strip() or "gpt-4o-mini"
    temperature = float(os.getenv("OPENAI_WRITING_TEMPERATURE", 0.2))

    response = client.responses.create(
        model=model,
        temperature=temperature,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "ielts_speaking_score",
                "strict": True,
                "schema": _schema(),
            }
        },
    )

    raw_text = _extract_output_text(response)
    if not raw_text:
        raise ValueError("Empty AI response")

    return json.loads(raw_text)


def check_speaking_progress(progress) -> Dict[str, Any]:
    part1 = transcribe_audio(getattr(progress, "part1_audio_url", None) or "")
    part2 = transcribe_audio(getattr(progress, "part2_audio_url", None) or "")
    part3 = transcribe_audio(getattr(progress, "part3_audio_url", None) or "")

    prompt = build_prompt(part1, part2, part3)

    first_error = None
    for _ in range(2):
        try:
            raw = call_openai(prompt)
            result = parse_and_validate(raw)
            result["transcript"] = {
                "part1": part1,
                "part2": part2,
                "part3": part3,
            }
            return result
        except Exception as exc:  # noqa: BLE001
            first_error = exc

    raise HTTPException(status_code=502, detail=f"Speaking AI check failed: {first_error}")
