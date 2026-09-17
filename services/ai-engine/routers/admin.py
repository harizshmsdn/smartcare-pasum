from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.admin_service as admin_service
from models.schemas import *
from core.auth import get_current_user
from core.database import get_db
from core.rate_limiter import rate_limit

router = APIRouter(tags=["admin"])

@router.get("/api/admin/dashboard", dependencies=[Depends(rate_limit(60, 60))])
@router.get("/api/admin/users", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_users(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_users(user=user, db=db)

@router.post("/api/admin/users", dependencies=[Depends(rate_limit(30, 60))])
def create_admin_user(req: AdminUserCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_user(req=req, user=user, db=db)

@router.patch("/api/admin/users/{user_id}", dependencies=[Depends(rate_limit(30, 60))])
def update_admin_user(user_id: str, req: AdminUserUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_user(user_id=user_id, req=req, user=user, db=db)

@router.delete("/api/admin/users/{user_id}", dependencies=[Depends(rate_limit(20, 60))])
def delete_admin_user(user_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_user(user_id=user_id, user=user, db=db)

@router.get("/api/admin/subjects", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_subjects(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_subjects(user=user, db=db)

@router.post("/api/admin/subjects", dependencies=[Depends(rate_limit(30, 60))])
def create_admin_subject(req: AdminSubjectCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_subject(req=req, user=user, db=db)

@router.get("/api/admin/classes", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_classes(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_classes(user=user, db=db)

@router.post("/api/admin/classes", dependencies=[Depends(rate_limit(30, 60))])
def create_admin_class(req: AdminClassCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_class(req=req, user=user, db=db)

@router.delete("/api/admin/classes/{class_id}", dependencies=[Depends(rate_limit(20, 60))])
def delete_admin_class(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_class(class_id=class_id, user=user, db=db)

@router.get("/api/admin/enrollments", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_enrollments(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_enrollments(user=user, db=db)

@router.post("/api/admin/enrollments", dependencies=[Depends(rate_limit(30, 60))])
def create_admin_enrollment(req: AdminEnrollmentRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_enrollment(req=req, user=user, db=db)

@router.delete("/api/admin/enrollments/{enrollment_id}", dependencies=[Depends(rate_limit(20, 60))])
def delete_admin_enrollment(enrollment_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_enrollment(enrollment_id=enrollment_id, user=user, db=db)

@router.get("/api/admin/interventions", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_interventions(user=user, db=db)

@router.patch("/api/admin/interventions/{intervention_id}", dependencies=[Depends(rate_limit(30, 60))])
def update_admin_intervention(intervention_id: str, req: AdminInterventionUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_intervention(intervention_id=intervention_id, req=req, user=user, db=db)

@router.get("/api/admin/merit-claims", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_merit_claims(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_merit_claims(user=user, db=db)

@router.patch("/api/admin/merit-claims/{claim_id}", dependencies=[Depends(rate_limit(30, 60))])
def review_admin_merit_claim(claim_id: str, req: AdminMeritReviewRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.review_admin_merit_claim(claim_id=claim_id, req=req, user=user, db=db)

@router.get("/api/admin/settings", dependencies=[Depends(rate_limit(60, 60))])
def get_admin_settings(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_settings(user=user, db=db)

@router.post("/api/admin/settings", dependencies=[Depends(rate_limit(20, 60))])
def update_admin_settings(req: AdminSettingsUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_settings(req=req, user=user, db=db)
