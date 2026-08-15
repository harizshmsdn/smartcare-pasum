from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.lecturer_service as lecturer_service
from core.auth import get_current_user
from core.database import get_db

router = APIRouter(tags=["lecturer"])

@router.get("/api/lecturer/dashboard")
def get_lecturer_dashboard(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_dashboard(user=user, db=db)

@router.get("/api/lecturer/classes")
def get_lecturer_classes(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_classes(user=user, db=db)

@router.get("/api/lecturer/classes/{class_id}/roster")
def get_class_roster(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_class_roster(class_id=class_id, user=user, db=db)

@router.get("/api/lecturer/interventions")
def get_lecturer_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.get_lecturer_interventions(user=user, db=db)

@router.patch("/api/lecturer/interventions/{intervention_id}")
def update_lecturer_intervention(intervention_id: str, req: dict, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return lecturer_service.update_intervention(intervention_id=intervention_id, req=req, user=user, db=db)
