from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import services.alerts_service as alerts_service
from core.auth import get_current_user
from core.database import get_db
from core.rate_limiter import rate_limit

router = APIRouter(tags=["alerts"])

@router.get("/api/alerts", dependencies=[Depends(rate_limit(60, 60))])
def get_alerts(filter: Optional[str] = "all", user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.get_alerts(filter=filter, user=user, db=db)

@router.patch("/api/alerts/{alert_id}/read", dependencies=[Depends(rate_limit(30, 60))])
def mark_alert_read(alert_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.mark_alert_read(alert_id=alert_id, user=user, db=db)

@router.post("/api/alerts/mark-all-read", dependencies=[Depends(rate_limit(20, 60))])
def mark_all_alerts_read(user: dict = Depends(get_current_user), db = Depends(get_db)):
    return alerts_service.mark_all_alerts_read(user=user, db=db)
