from fastapi import HTTPException, Depends
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import json
from datetime import datetime, timedelta
from models.schemas import *
from core.auth import check_user_auth, check_admin_auth, get_current_user
from core.database import get_db

def get_alerts(filter: Optional[str] = "all", user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            cur.execute(
                """
                SELECT 
                    a.id,
                    a.type,
                    a.priority,
                    a.message,
                    a.is_read,
                    a.created_at,
                    p.id as student_uuid,
                    p.institutional_id as matric_id,
                    p.full_name as student_name,
                    s.name as course_name
                FROM public.alerts a
                LEFT JOIN public.profiles p ON a.student_id = p.id
                LEFT JOIN public.classes c ON a.class_id = c.id
                LEFT JOIN public.subjects s ON c.subject_id = s.id
                WHERE a.lecturer_id = %s OR %s = 'admin'
                ORDER BY a.created_at DESC;
                """,
                (user_id, actual_role)
            )
            rows = cur.fetchall() or []

            now_ms = datetime.utcnow().timestamp() * 1000
            formatted_alerts = []
            unread_count = 0

            for r in rows:
                is_read = bool(r["is_read"])
                if not is_read:
                    unread_count += 1

                created_ms = r["created_at"].timestamp() * 1000 if r["created_at"] else now_ms
                diff_min = max(0, int((now_ms - created_ms) / 60000))
                diff_hr = int(diff_min / 60)
                diff_day = int(diff_hr / 24)

                if diff_day > 0:
                    time_str = f"{diff_day} day{'s' if diff_day > 1 else ''} ago"
                elif diff_hr > 0:
                    time_str = f"{diff_hr} hour{'s' if diff_hr > 1 else ''} ago"
                elif diff_min > 0:
                    time_str = f"{diff_min} min{'s' if diff_min > 1 else ''} ago"
                else:
                    time_str = "Just now"

                formatted_alerts.append({
                    "id": str(r["id"]),
                    "studentName": r["student_name"] or "Unknown Student",
                    "matricId": r["matric_id"] or "N/A",
                    "studentUuid": str(r["student_uuid"]) if r["student_uuid"] else "",
                    "course": r["course_name"] or "General",
                    "type": r["type"] or "system",
                    "priority": r["priority"] or "medium",
                    "message": r["message"] or "",
                    "timestamp": time_str,
                    "isRead": is_read
                })

            if filter == "unread":
                filtered = [a for a in formatted_alerts if not a["isRead"]]
            elif filter == "critical":
                filtered = [a for a in formatted_alerts if a["priority"] == "critical"]
            else:
                filtered = formatted_alerts

            return {
                "unread_count": unread_count,
                "alerts": filtered
            }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Alerts Database Error: {str(e)}")


def mark_alert_read(alert_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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

            db.commit()
            return {"status": "success", "alert": updated}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Mark Alert Read Error: {str(e)}")


def mark_all_alerts_read(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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
            db.commit()
            return {"status": "success", "message": "All alerts marked as read."}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Mark All Read Error: {str(e)}")

