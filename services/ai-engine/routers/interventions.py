from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from models.schemas import *
from core.database import get_db, get_db_connection

router = APIRouter(tags=["interventions"])

@router.post("/api/interventions")
def create_intervention(req: InterventionCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            # Check authorization: user must be a lecturer (or admin)
            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role
            if actual_role not in ["lecturer", "admin"]:
                raise HTTPException(status_code=403, detail="Access denied: Only lecturers or admins can create interventions")

            # Check that the student exists
            cur.execute("SELECT full_name, email FROM public.profiles WHERE id = %s LIMIT 1;", (req.student_id,))
            student = cur.fetchone()
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")

            # Check that the class exists
            cur.execute("""
                SELECT s.name as subject_name, c.group_code
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                WHERE c.id = %s LIMIT 1;
            """, (req.class_id,))
            class_info = cur.fetchone()
            if not class_info:
                raise HTTPException(status_code=404, detail="Class not found")
            subject_name = f"{class_info['subject_name']} ({class_info['group_code']})"

            # Insert the intervention
            cur.execute(
                """
                INSERT INTO public.interventions (
                    student_id,
                    class_id,
                    lecturer_id,
                    issue_description,
                    status,
                    priority,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, student_id, class_id, lecturer_id, issue_description, status, priority, created_at;
                """,
                (req.student_id, req.class_id, user_id, req.issue_description, req.status, req.priority)
            )
            intervention = cur.fetchone()

            # Schedule academic advising if requested
            if req.schedule_advising:
                cur.execute(
                    """
                    INSERT INTO public.alerts (
                        lecturer_id,
                        student_id,
                        class_id,
                        type,
                        priority,
                        message,
                        is_read,
                        created_at
                    ) VALUES (%s, %s, %s, 'academic', %s, %s, false, CURRENT_TIMESTAMP);
                    """,
                    (user_id, req.student_id, req.class_id, req.priority, f"Academic advising scheduled for your class: {subject_name}. Please check in with your lecturer.")
                )

            # Always insert alert for student regarding the intervention setup
            cur.execute(
                """
                INSERT INTO public.alerts (
                    lecturer_id,
                    student_id,
                    class_id,
                    type,
                    priority,
                    message,
                    is_read,
                    created_at
                ) VALUES (%s, %s, %s, 'academic', %s, %s, false, CURRENT_TIMESTAMP);
                """,
                (user_id, req.student_id, req.class_id, req.priority, f"An academic intervention case has been created for your class: {subject_name}. Reason: {req.issue_description}")
            )

            conn.commit()

            # Send mock email notification
            send_intervention_email(student["email"], student["full_name"], subject_name, req.issue_description)

            return {"status": "success", "intervention": intervention}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create Intervention Error: {str(e)}")
    finally:
        conn.close()


