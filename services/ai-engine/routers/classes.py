from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from models.schemas import *
from core.database import get_db, get_db_connection

router = APIRouter(tags=["classes"])

@router.post("/api/sessions/start")
def start_session(req: SessionStartRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Authorize - verify lecturer or admin permissions
            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user["id"],))
            profile = cur.fetchone()
            
            user_role = profile["role"] if profile else "student"
            if user_role not in ["lecturer", "admin"]:
                raise HTTPException(status_code=403, detail="Access denied: Only lecturers or admins can open class sessions.")

            # If user is a lecturer, verify they own the class
            if user_role == "lecturer":
                cur.execute("SELECT id FROM public.classes WHERE id = %s AND lecturer_id = %s LIMIT 1;", (req.class_id, user["id"]))
                if cur.fetchone() is None:
                    raise HTTPException(status_code=403, detail="Access denied: You are not the assigned lecturer for this class.")

            # 2. Concurrency check - Prevent multiple active sessions for the same class
            cur.execute(
                "SELECT id, session_pin, opened_at FROM public.attendance_sessions WHERE class_id = %s AND closed_at IS NULL LIMIT 1;", 
                (req.class_id,)
            )
            existing_active_session = cur.fetchone()
            if existing_active_session:
                return {
                    "status": "active_exists",
                    "message": "An active attendance session already exists for this class.",
                    "session": existing_active_session
                }

            # 3. Generate secure PIN
            session_pin = generate_complex_pin(conn)
            opened_at = req.opened_at if req.opened_at else datetime.utcnow().isoformat()

            # 4. Atomic Database Insert
            cur.execute(
                """
                INSERT INTO public.attendance_sessions (
                    class_id, opened_at, session_pin, geo_lat, geo_lng, geo_radius_meters, 
                    online_mode, face_id_required, location_required
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, class_id, opened_at, session_pin, online_mode, face_id_required, location_required;
                """,
                (
                    req.class_id, opened_at, session_pin, req.geo_lat, req.geo_lng, req.geo_radius_meters,
                    req.online_mode, req.face_id_required, req.location_required
                )
            )
            new_session = cur.fetchone()
            conn.commit()
            
            return {
                "status": "success",
                "session": new_session
            }
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        conn.close()

@router.get("/api/classes/{class_id}/assessments")
@router.post("/api/classes/{class_id}/assessments")
def create_class_assessment(class_id: str, req: AssessmentCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            cur.execute("SELECT id FROM public.classes WHERE id = %s AND (lecturer_id = %s OR %s = 'admin') LIMIT 1;", (class_id, user_id, actual_role))
            if cur.fetchone() is None:
                raise HTTPException(status_code=403, detail="Access denied: Not authorized for this class")

            # Validate type
            valid_types = ["Continuous", "Midterm", "Final"]
            if req.type not in valid_types:
                raise HTTPException(status_code=400, detail=f"Invalid assessment type. Must be one of {valid_types}")

            cur.execute(
                """
                INSERT INTO public.assessments (class_id, title, type, weightage, total_marks)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, class_id, title, type, weightage, total_marks, created_at;
                """,
                (class_id, req.title, req.type, req.weightage, req.total_marks)
            )
            new_assessment = cur.fetchone()
            conn.commit()

            return {
                "status": "success",
                "assessment": {
                    "id": str(new_assessment["id"]),
                    "title": new_assessment["title"],
                    "type": new_assessment["type"],
                    "weightage": float(new_assessment["weightage"]),
                    "total_marks": int(new_assessment["total_marks"]),
                    "created_at": new_assessment["created_at"].isoformat()
                }
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create Assessment Error: {str(e)}")
    finally:
        conn.close()


@router.post("/api/assessments/{assessment_id}/scores")
def save_student_score(assessment_id: str, req: ScoreSaveRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            # Verify assessment exists and belongs to lecturer's class
            cur.execute(
                """
                SELECT a.id, a.total_marks
                FROM public.assessments a
                JOIN public.classes c ON a.class_id = c.id
                WHERE a.id = %s AND (c.lecturer_id = %s OR %s = 'admin') LIMIT 1;
                """,
                (assessment_id, user_id, actual_role)
            )
            assessment = cur.fetchone()
            if not assessment:
                raise HTTPException(status_code=403, detail="Access denied or assessment not found")

            if req.score_achieved < 0 or req.score_achieved > int(assessment["total_marks"]):
                raise HTTPException(status_code=400, detail=f"Score must be between 0 and {assessment['total_marks']}")

            # Upsert score
            cur.execute(
                """
                INSERT INTO public.student_scores (assessment_id, student_id, score_achieved, date_recorded)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (assessment_id, student_id)
                DO UPDATE SET score_achieved = EXCLUDED.score_achieved, date_recorded = NOW()
                RETURNING id, assessment_id, student_id, score_achieved;
                """,
                (assessment_id, req.student_id, req.score_achieved)
            )
            saved_score = cur.fetchone()
            conn.commit()

            return {
                "status": "success",
                "score": {
                    "id": str(saved_score["id"]),
                    "assessment_id": str(saved_score["assessment_id"]),
                    "student_id": str(saved_score["student_id"]),
                    "score_achieved": float(saved_score["score_achieved"])
                }
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Save Score Error: {str(e)}")
    finally:
        conn.close()


