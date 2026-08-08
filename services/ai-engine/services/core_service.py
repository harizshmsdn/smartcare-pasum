from fastapi import HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import json
from datetime import datetime, timedelta
from models.schemas import *
from core.auth import check_user_auth, check_admin_auth

def generate_complex_pin(conn) -> str:
    """Generates a secure 6-digit alphanumeric PIN, avoiding UX confusing chars (O, 0, I, 1)."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    
    for _ in range(10):
        part1 = "".join(random.choices(chars, k=3))
        part2 = "".join(random.choices(chars, k=3))
        pin = f"{part1}-{part2}"
        
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM public.attendance_sessions WHERE session_pin = %s AND closed_at IS NULL LIMIT 1;", 
                (pin,)
            )
            if cur.fetchone() is None:
                return pin
                
    raise HTTPException(status_code=500, detail="Failed to generate a unique PIN. Please try again.")

def start_session(req: SessionStartRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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
            session_pin = generate_complex_pin(db)
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
            db.commit()
            
            return {
                "status": "success",
                "session": new_session
            }
            
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


def get_class_assessments(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")

            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            # Check authorization
            cur.execute("SELECT id FROM public.classes WHERE id = %s AND (lecturer_id = %s OR %s = 'admin') LIMIT 1;", (class_id, user_id, actual_role))
            if cur.fetchone() is None:
                raise HTTPException(status_code=403, detail="Access denied: Not authorized for this class")

            # 1. Fetch assessments
            cur.execute(
                """
                SELECT id, title, type, weightage, total_marks, created_at
                FROM public.assessments
                WHERE class_id = %s
                ORDER BY created_at ASC;
                """,
                (class_id,)
            )
            assessments = cur.fetchall() or []
            formatted_assessments = [
                {
                    "id": str(a["id"]),
                    "title": a["title"],
                    "type": a["type"],
                    "weightage": float(a["weightage"]),
                    "total_marks": int(a["total_marks"]),
                    "created_at": a["created_at"].isoformat() if a["created_at"] else ""
                }
                for a in assessments
            ]

            # 2. Fetch enrolled students
            cur.execute(
                """
                SELECT 
                    p.id as student_id,
                    p.full_name as student_name,
                    p.institutional_id as matric_id
                FROM public.enrollments e
                JOIN public.profiles p ON e.student_id = p.id
                WHERE e.class_id = %s
                ORDER BY p.full_name ASC;
                """,
                (class_id,)
            )
            students = cur.fetchall() or []

            # 3. Fetch all scores for this class
            cur.execute(
                """
                SELECT ss.assessment_id, ss.student_id, ss.score_achieved
                FROM public.student_scores ss
                JOIN public.assessments a ON ss.assessment_id = a.id
                WHERE a.class_id = %s;
                """,
                (class_id,)
            )
            scores_rows = cur.fetchall() or []

            # Build matrix map: student_id -> { assessment_id -> score }
            scores_map = {}
            for r in scores_rows:
                s_id = str(r["student_id"])
                a_id = str(r["assessment_id"])
                if s_id not in scores_map:
                    scores_map[s_id] = {}
                scores_map[s_id][a_id] = float(r["score_achieved"])

            formatted_roster = []
            for s in students:
                s_id = str(s["student_id"])
                st_scores = scores_map.get(s_id, {})
                formatted_roster.append({
                    "student_id": s_id,
                    "student_name": s["student_name"],
                    "matric_id": s["matric_id"],
                    "scores": st_scores
                })

            return {
                "assessments": formatted_assessments,
                "roster": formatted_roster
            }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Assessments Fetch Error: {str(e)}")


def create_class_assessment(class_id: str, req: AssessmentCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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
            db.commit()

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
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Create Assessment Error: {str(e)}")


def save_student_score(assessment_id: str, req: ScoreSaveRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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
            db.commit()

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
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Save Score Error: {str(e)}")

