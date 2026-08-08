from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.admin_service as admin_service
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import uuid
import json

from models.schemas import *
from core.auth import get_current_user
from core.database import get_db

router = APIRouter(tags=["admin"])

@router.get("/api/admin/dashboard")
@router.get("/api/admin/users")
def get_admin_users(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_users(user=user, db=db)

@router.post("/api/admin/users")
def create_admin_user(req: AdminUserCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_user(req=req, user=user, db=db)

@router.patch("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, req: AdminUserUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_user(user_id=user_id, req=req, user=user, db=db)

@router.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_user(user_id=user_id, user=user, db=db)

@router.get("/api/admin/subjects")
def get_admin_subjects(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_subjects(user=user, db=db)

@router.post("/api/admin/subjects")
def create_admin_subject(req: AdminSubjectCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_subject(req=req, user=user, db=db)

@router.get("/api/admin/classes")
def get_admin_classes(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_classes(user=user, db=db)

@router.post("/api/admin/classes")
def create_admin_class(req: AdminClassCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_class(req=req, user=user, db=db)

@router.delete("/api/admin/classes/{class_id}")
def delete_admin_class(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_class(class_id=class_id, user=user, db=db)

@router.get("/api/admin/enrollments")
def get_admin_enrollments(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_enrollments(user=user, db=db)

@router.post("/api/admin/enrollments")
def create_admin_enrollment(req: AdminEnrollmentRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.create_admin_enrollment(req=req, user=user, db=db)

@router.delete("/api/admin/enrollments/{enrollment_id}")
def delete_admin_enrollment(enrollment_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.delete_admin_enrollment(enrollment_id=enrollment_id, user=user, db=db)

@router.get("/api/admin/interventions")
def get_admin_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_interventions(user=user, db=db)

@router.patch("/api/admin/interventions/{intervention_id}")
def update_admin_intervention(intervention_id: str, req: AdminInterventionUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_intervention(intervention_id=intervention_id, req=req, user=user, db=db)

@router.get("/api/admin/merit-claims")
def get_admin_merit_claims(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_merit_claims(user=user, db=db)

@router.patch("/api/admin/merit-claims/{claim_id}")
def review_admin_merit_claim(claim_id: str, req: AdminMeritReviewRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.review_admin_merit_claim(claim_id=claim_id, req=req, user=user, db=db)

@router.get("/api/admin/settings")
def get_admin_settings(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.get_admin_settings(user=user, db=db)

@router.post("/api/admin/settings")
def update_admin_settings(req: AdminSettingsUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return admin_service.update_admin_settings(req=req, user=user, db=db)

