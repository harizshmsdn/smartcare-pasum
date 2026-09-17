from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.lecturer_service as lecturer_service
from models.schemas import LecturerInterventionUpdateRequest
from core.auth import get_current_user
from core.database import get_db
from core.rate_limiter import rate_limit

router = APIRouter(tags=["lecturer"])

@router.get("/api/lecturer/dashboard", dependencies=[Depends(rate_limit(60, 60))])
def get_lecturer_dashboard(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_dashboard(user=user, db=db)

@router.get("/api/lecturer/classes", dependencies=[Depends(rate_limit(60, 60))])
def get_lecturer_classes(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_classes(user=user, db=db)

@router.get("/api/lecturer/classes/{class_id}/roster", dependencies=[Depends(rate_limit(60, 60))])
def get_class_roster(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_class_roster(class_id=class_id, user=user, db=db)

@router.get("/api/lecturer/interventions", dependencies=[Depends(rate_limit(60, 60))])
def get_lecturer_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_interventions(user=user, db=db)

@router.patch("/api/lecturer/interventions/{intervention_id}", dependencies=[Depends(rate_limit(30, 60))])
def update_lecturer_intervention(intervention_id: str, req: LecturerInterventionUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.update_intervention(intervention_id=intervention_id, req=req.model_dump(), user=user, db=db)
