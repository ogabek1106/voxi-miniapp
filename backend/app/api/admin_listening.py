from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import ListeningBlock, ListeningQuestion, ListeningSection, ListeningTest

router = APIRouter(prefix="/admin/listening", tags=["admin-listening"])


class ListeningQuestionIn(BaseModel):
    order_index: int
    question_number: int
    type: Optional[str] = None
    content: Any = None
    correct_answer: Any = None
    meta: dict = Field(default_factory=dict)


class ListeningBlockIn(BaseModel):
    order_index: int
    block_type: str
    title: Optional[str] = None
    instruction: Optional[str] = None
    image_url: Optional[str] = None
    start_time_seconds: Optional[int] = None
    end_time_seconds: Optional[int] = None
    meta: dict = Field(default_factory=dict)
    questions: List[ListeningQuestionIn] = Field(default_factory=list)


class ListeningSectionIn(BaseModel):
    order_index: int
    section_number: int
    instructions: Optional[str] = None
    global_instruction_after: Optional[str] = None
    global_instruction_after_audio_url: Optional[str] = None
    blocks: List[ListeningBlockIn] = Field(default_factory=list)


class ListeningTestSaveIn(BaseModel):
    title: Optional[str] = None
    audio_url: Optional[str] = None
    global_instruction_intro: Optional[str] = None
    global_instruction_intro_audio_url: Optional[str] = None
    time_limit_minutes: int = 60
    status: str = "draft"
    sections: List[ListeningSectionIn] = Field(default_factory=list)


@router.get("/mock-packs/{pack_id}")
def get_listening_by_mock_pack(pack_id: int, db: Session = Depends(get_db)):
    # Pack-linked storage without schema changes:
    # listening_tests.id is used as pack id.
    test = db.query(ListeningTest).filter(ListeningTest.id == pack_id).first()
    if not test:
        return {
            "id": pack_id,
            "title": "",
            "audio_url": None,
            "global_instruction_intro": "",
            "global_instruction_intro_audio_url": None,
            "time_limit_minutes": 60,
            "status": "draft",
            "sections": []
        }

    sections = (
        db.query(ListeningSection)
        .filter(ListeningSection.test_id == test.id)
        .order_by(ListeningSection.order_index.asc(), ListeningSection.id.asc())
        .all()
    )

    output_sections = []
    for section in sections:
        blocks = (
            db.query(ListeningBlock)
            .filter(ListeningBlock.section_id == section.id)
            .order_by(ListeningBlock.order_index.asc(), ListeningBlock.id.asc())
            .all()
        )
        out_blocks = []
        for block in blocks:
            questions = (
                db.query(ListeningQuestion)
                .filter(ListeningQuestion.block_id == block.id)
                .order_by(ListeningQuestion.order_index.asc(), ListeningQuestion.id.asc())
                .all()
            )
            out_blocks.append({
                "id": block.id,
                "order_index": block.order_index,
                "block_type": block.block_type,
                "title": block.title,
                "instruction": block.instruction,
                "image_url": block.image_url,
                "start_time_seconds": block.start_time_seconds,
                "end_time_seconds": block.end_time_seconds,
                "meta": block.meta or {},
                "questions": [
                    {
                        "id": q.id,
                        "order_index": q.order_index,
                        "question_number": q.question_number,
                        "type": q.type,
                        "content": q.content,
                        "correct_answer": q.correct_answer,
                        "meta": q.meta or {}
                    }
                    for q in questions
                ]
            })

        output_sections.append({
            "id": section.id,
            "order_index": section.order_index,
            "section_number": section.section_number,
            "instructions": section.instructions,
            "global_instruction_after": section.global_instruction_after,
            "global_instruction_after_audio_url": section.global_instruction_after_audio_url,
            "blocks": out_blocks
        })

    return {
        "id": test.id,
        "title": test.title or "",
        "audio_url": test.audio_url,
        "global_instruction_intro": test.global_instruction_intro or "",
        "global_instruction_intro_audio_url": test.global_instruction_intro_audio_url,
        "time_limit_minutes": test.time_limit_minutes or 60,
        "status": test.status or "draft",
        "sections": output_sections
    }


@router.put("/mock-packs/{pack_id}")
def save_listening_by_mock_pack(pack_id: int, payload: ListeningTestSaveIn, db: Session = Depends(get_db)):
    test = db.query(ListeningTest).filter(ListeningTest.id == pack_id).first()
    if not test:
        test = ListeningTest(id=pack_id, created_at=datetime.utcnow())
        db.add(test)
        db.flush()

    test.title = payload.title or ""
    test.audio_url = payload.audio_url
    test.global_instruction_intro = payload.global_instruction_intro or ""
    test.global_instruction_intro_audio_url = payload.global_instruction_intro_audio_url
    test.time_limit_minutes = int(payload.time_limit_minutes or 60)
    test.status = payload.status or "draft"
    test.updated_at = datetime.utcnow()

    # Replace nested structure atomically.
    existing_sections = db.query(ListeningSection).filter(ListeningSection.test_id == test.id).all()
    for section in existing_sections:
        db.delete(section)
    db.flush()

    for section_in in payload.sections:
        section = ListeningSection(
            test_id=test.id,
            section_number=int(section_in.section_number or 1),
            instructions=section_in.instructions,
            global_instruction_after=section_in.global_instruction_after,
            global_instruction_after_audio_url=section_in.global_instruction_after_audio_url,
            order_index=int(section_in.order_index or 0),
        )
        db.add(section)
        db.flush()

        for block_in in section_in.blocks:
            block = ListeningBlock(
                section_id=section.id,
                order_index=int(block_in.order_index or 0),
                block_type=block_in.block_type,
                title=block_in.title,
                instruction=block_in.instruction,
                image_url=block_in.image_url,
                start_time_seconds=block_in.start_time_seconds,
                end_time_seconds=block_in.end_time_seconds,
                meta=block_in.meta or {},
            )
            db.add(block)
            db.flush()

            for question_in in block_in.questions:
                question = ListeningQuestion(
                    block_id=block.id,
                    order_index=int(question_in.order_index or 0),
                    question_number=int(question_in.question_number or 0),
                    type=question_in.type,
                    content=question_in.content,
                    correct_answer=question_in.correct_answer,
                    meta=question_in.meta or {}
                )
                db.add(question)

    db.commit()
    return {"ok": True, "id": test.id}

