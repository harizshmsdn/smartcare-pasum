from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.student_service as student_service

from models.schemas import StudentMeritClaimRequest, InterventionCreateRequest, StudentSettingsUpdateRequest
from core.auth import get_current_user
from core.database import get_db
from core.rate_limiter import rate_limit

router = APIRouter(tags=["student"])

@router.get("/api/student/dashboard", dependencies=[Depends(rate_limit(60, 60))])
def get_student_dashboard_analytics(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_dashboard_analytics(user=user, db=db)

@router.get("/api/student/classes/{class_id}/details", dependencies=[Depends(rate_limit(60, 60))])
def get_student_class_details(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_class_details(class_id=class_id, user=user, db=db)

@router.get("/api/student/alerts", dependencies=[Depends(rate_limit(60, 60))])
def get_student_alerts(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_alerts(user=user, db=db)

@router.post("/api/student/alerts/mark-all-read", dependencies=[Depends(rate_limit(20, 60))])
def mark_all_student_alerts_read(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.mark_all_student_alerts_read(user=user, db=db)

@router.patch("/api/student/alerts/{alert_id}/read", dependencies=[Depends(rate_limit(30, 60))])
def mark_student_alert_read(alert_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.mark_student_alert_read(alert_id=alert_id, user=user, db=db)

@router.get("/api/student/merit-claims", dependencies=[Depends(rate_limit(60, 60))])
def get_student_merit_claims(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_merit_claims(user=user, db=db)

@router.post("/api/student/merit-claims", dependencies=[Depends(rate_limit(10, 60))])
def create_student_merit_claim(req: StudentMeritClaimRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.create_student_merit_claim(req=req, user=user, db=db)

@router.post("/api/interventions", dependencies=[Depends(rate_limit(20, 60))])
def create_intervention(req: InterventionCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.create_intervention(req=req, user=user, db=db)

@router.get("/api/student/interventions", dependencies=[Depends(rate_limit(60, 60))])
def get_student_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_interventions(user=user, db=db)

@router.get("/api/student/settings", dependencies=[Depends(rate_limit(60, 60))])
def get_student_settings(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.get_student_settings(user=user, db=db)

@router.patch("/api/student/settings", dependencies=[Depends(rate_limit(20, 60))])
def update_student_settings(settings: StudentSettingsUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return student_service.update_student_settings(settings=settings.model_dump(), user=user, db=db)
