from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.analytics_service as analytics_service
from core.auth import get_current_user
from core.database import get_db
from core.rate_limiter import rate_limit

router = APIRouter(tags=["analytics"])

@router.get("/api/analytics/dashboard", dependencies=[Depends(rate_limit(60, 60))])
def get_dashboard_analytics(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_dashboard_analytics(user=user, db=db)

@router.get("/api/analytics/trajectory", dependencies=[Depends(rate_limit(60, 60))])
def get_class_trajectory(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_class_trajectory(class_id=class_id, user=user, db=db)

@router.get("/api/students/{student_id}/analytics", dependencies=[Depends(rate_limit(60, 60))])
def get_student_analytics(student_id: str, class_id: Optional[str] = None, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return analytics_service.get_student_analytics(student_id=student_id, class_id=class_id, user=user, db=db)
