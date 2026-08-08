from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from models.schemas import *
from core.database import get_db, get_db_connection

router = APIRouter(tags=["alerts"])

@router.get("/api/alerts")
@router.patch("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            cur.execute(
                """
                UPDATE public.alerts 
                SET is_read = true 
                WHERE id = %s AND (lecturer_id = %s OR %s = 'admin')
                RETURNING id, is_read;
                """,
                (alert_id, user_id, actual_role)
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Alert not found or access denied")

            conn.commit()
            return {"status": "success", "alert": updated}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mark Alert Read Error: {str(e)}")
    finally:
        conn.close()


@router.post("/api/alerts/mark-all-read")
def mark_all_alerts_read(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            cur.execute(
                """
                UPDATE public.alerts 
                SET is_read = true 
                WHERE (lecturer_id = %s OR %s = 'admin') AND is_read = false;
                """,
                (user_id, actual_role)
            )
            conn.commit()
            return {"status": "success", "message": "All alerts marked as read."}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mark All Read Error: {str(e)}")
    finally:
        conn.close()


