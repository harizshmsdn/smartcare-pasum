from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.alerts_service as alerts_service
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

from models.schemas import *
from core.auth import get_current_user, check_user_auth, check_admin_auth
from core.database import get_db

router = APIRouter(tags=["alerts"])

@router.get("/api/alerts")
def get_alerts(filter: Optional[str] = "all", user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.get_alerts(filter=filter, user=user, db=db)

@router.patch("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.mark_alert_read(alert_id=alert_id, user=user, db=db)

@router.post("/api/alerts/mark-all-read")
def mark_all_alerts_read(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.mark_all_alerts_read(user=user, db=db)

