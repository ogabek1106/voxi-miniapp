from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas.shadow_writing import ShadowWritingEssayIn
from app.services import shadow_writing_service as service

router = APIRouter(prefix="/admin/shadow-writing", tags=["admin-shadow-writing"])


@router.post("/essays")
def create_shadow_writing_essay(payload: ShadowWritingEssayIn, db: Session = Depends(get_db)):
    essay = service.create_essay(db, payload)
    return {"ok": True, "essay": service.serialize_essay(essay)}


@router.get("/essays")
def list_shadow_writing_essays(db: Session = Depends(get_db)):
    return {"ok": True, "essays": [service.serialize_essay(essay) for essay in service.list_essays(db)]}


@router.delete("/essays/{essay_id}")
def delete_shadow_writing_essay(essay_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_essay(db, essay_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="shadow_writing_essay_not_found")
    return {"ok": True, "id": essay_id}
