from fastapi import APIRouter, Depends
import services.core_service as core_service
from models.schemas import SessionStartRequest, AssessmentCreateRequest, ScoreSaveRequest
from core.auth import get_current_user
from core.database import get_db

router = APIRouter(tags=["core"])

@router.post("/api/sessions/start")
def start_session(req: SessionStartRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return core_service.start_session(req=req, user=user, db=db)

@router.get("/api/classes/{class_id}/assessments")
def get_class_assessments(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return core_service.get_class_assessments(class_id=class_id, user=user, db=db)

@router.post("/api/classes/{class_id}/assessments")
def create_class_assessment(class_id: str, req: AssessmentCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return core_service.create_class_assessment(class_id=class_id, req=req, user=user, db=db)

@router.post("/api/assessments/{assessment_id}/scores")
def save_student_score(assessment_id: str, req: ScoreSaveRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return core_service.save_student_score(assessment_id=assessment_id, req=req, user=user, db=db)

@router.delete("/api/assessments/{assessment_id}")
def delete_assessment(assessment_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return core_service.delete_assessment(assessment_id=assessment_id, user=user, db=db)

