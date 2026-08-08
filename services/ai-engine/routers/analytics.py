from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.analytics_service as analytics_service
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

from models.schemas import *
from core.auth import get_current_user, check_user_auth, check_admin_auth
from core.database import get_db

router = APIRouter(tags=["analytics"])

@router.get("/api/analytics/dashboard")
def get_dashboard_analytics(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_dashboard_analytics(user=user, db=db)

@router.get("/api/analytics/trajectory")
def get_class_trajectory(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_class_trajectory(class_id=class_id, user=user, db=db)

@router.get("/api/students/{student_id}/analytics")
def get_student_analytics(student_id: str, class_id: Optional[str] = None, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_student_analytics(student_id=student_id, class_id=class_id, user=user, db=db)

