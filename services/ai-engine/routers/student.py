from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from models.schemas import *
from core.database import get_db, get_db_connection

router = APIRouter(tags=["student"])

@router.get("/api/students/{student_id}/analytics")
@router.get("/api/student/dashboard")
@router.get("/api/student/classes/{class_id}/details")
@router.get("/api/student/alerts")
@router.post("/api/student/alerts/mark-all-read")
def mark_all_student_alerts_read(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
            cur.execute("UPDATE public.alerts SET is_read = true WHERE student_id = %s;", (student_id,))
            conn.commit()
            return {"status": "success", "message": "All student alerts marked as read."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mark All Student Read Error: {str(e)}")
    finally:
        conn.close()


@router.patch("/api/student/alerts/{alert_id}/read")
def mark_student_alert_read(alert_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
            cur.execute("UPDATE public.alerts SET is_read = true WHERE id = %s AND student_id = %s RETURNING id;", (alert_id, student_id))
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Alert not found or access denied")
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mark Alert Read Error: {str(e)}")
    finally:
        conn.close()


@router.get("/api/student/merit-claims")
@router.post("/api/student/merit-claims")
def create_student_merit_claim(req: StudentMeritClaimRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
            cur.execute(
                """
                INSERT INTO public.merit_claims (student_id, title, category, awarded_points, description, proof_file_url, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                RETURNING id, student_id, title, category, awarded_points, description, proof_file_url, status, submitted_at;
                """,
                (student_id, req.title, req.category, req.awarded_points, req.description, req.proof_file_url)
            )
            claim = cur.fetchone()
            conn.commit()
            return {"status": "success", "claim": claim}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create Merit Claim Error: {str(e)}")
    finally:
        conn.close()


def send_intervention_email(student_email: str, student_name: str, subject_name: str, issue: str):
    # Print clear message to standard output/logs (this represents sending the email)
    print("\n" + "="*80)
    print(f"SMTP SIMULATOR: Sending Email to {student_email}...")
    print(f"Subject: Academic Intervention Initiated - {subject_name}")
    print(f"Dear {student_name},\n")
    print(f"This email is to notify you that an academic intervention case has been created for your class {subject_name}.")
    print(f"Details/Reason: {issue}")
    print("\nPlease log into SmartCare PASUM to view the intervention board or contact your lecturer for support.")
    print("="*80 + "\n")


@router.get("/api/student/interventions")
