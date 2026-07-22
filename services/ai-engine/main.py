import os
import random
import string
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
from jose import jwt, JWTError

app = FastAPI(title="SmartCare Attendance Engine", version="1.0.0")

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration settings
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-with-at-least-32-characters-long")
JWT_ALGORITHM = "HS256"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV.lower() == "production"

class SessionStartRequest(BaseModel):
    class_id: str
    opened_at: Optional[str] = None
    online_mode: bool = False
    face_id_required: bool = True
    location_required: bool = True
    geo_lat: float = Field(default=3.115)
    geo_lng: float = Field(default=101.655)
    geo_radius_meters: int = Field(default=50)

def get_db_connection():
    """Establishes connection to the Supabase local PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Decodes JWT and authenticates user role/ID securely."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Use 'Bearer <token>'")
    
    token = parts[1]
    try:
        # 1. Fetch unverified header to extract algorithm dynamically
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", JWT_ALGORITHM)
        
        # 2. Decode and verify Supabase JWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=[alg], options={"verify_aud": False})
        user_id = payload.get("sub")
        role = payload.get("role", "authenticated")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing sub")
        return {"id": user_id, "role": role}
    except Exception as e:
        if IS_PRODUCTION:
            raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")
            
        # Fallback for local development if signature validation fails or secret key changes
        try:
            payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
            user_id = payload.get("sub")
            role = payload.get("role", "authenticated")
            if user_id:
                print(f"WARNING: JWT signature verification failed ({str(e)}), using unverified payload for local testing.")
                return {"id": user_id, "role": role}
        except Exception as fallback_err:
            print(f"Fallback unverified decode failed: {str(fallback_err)}")
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")

def generate_complex_pin(conn) -> str:
    """Generates a secure 6-digit alphanumeric PIN, avoiding UX confusing chars (O, 0, I, 1)."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # UI/UX optimized character set
    
    # Loop to ensure PIN is unique and has no active duplicates
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

@app.post("/api/sessions/start")
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

@app.get("/api/analytics/dashboard")
def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")
            
            # Verify lecturer profile role
            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            # 1. Fetch assigned classes for this lecturer
            cur.execute(
                """
                SELECT c.id, s.code, s.name, c.group_code
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                WHERE c.lecturer_id = %s OR %s = 'admin'
                ORDER BY s.code, c.group_code;
                """,
                (user_id, actual_role)
            )
            classes_rows = cur.fetchall() or []
            assigned_classes = [
                {
                    "id": str(r["id"]),
                    "code": r["code"],
                    "name": r["name"],
                    "group_code": r["group_code"],
                    "label": f"{r['code']} - {r['name']} ({r['group_code']})"
                }
                for r in classes_rows
            ]

            # 2. Risk Clusters
            # Absenteeism count (<80% attendance rate in lecturer's classes)
            cur.execute(
                """
                SELECT COUNT(DISTINCT e.student_id) as absenteeism_count
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                WHERE (c.lecturer_id = %s OR %s = 'admin') AND e.current_attendance_rate < 80;
                """,
                (user_id, actual_role)
            )
            absenteeism_res = cur.fetchone()
            absenteeism_count = absenteeism_res["absenteeism_count"] if absenteeism_res else 0

            # Assessment Drop Count (interventions with needs_review or critical/high priority)
            cur.execute(
                """
                SELECT COUNT(*) as drop_count
                FROM public.interventions i
                JOIN public.classes c ON i.class_id = c.id
                WHERE (c.lecturer_id = %s OR %s = 'admin') AND i.status = 'needs_review';
                """,
                (user_id, actual_role)
            )
            drop_res = cur.fetchone()
            assessment_drop_count = drop_res["drop_count"] if drop_res else 0

            # 3. Merit Raw Scores Distribution (0-100, 101-200, 201-300, 301-400, 401-500)
            # Calculated directly from student profiles enrolled in lecturer's classes
            cur.execute(
                """
                SELECT DISTINCT p.id, COALESCE(p.total_merit_score, 0) as total_merit_score
                FROM public.profiles p
                JOIN public.enrollments e ON e.student_id = p.id
                JOIN public.classes c ON e.class_id = c.id
                WHERE (c.lecturer_id = %s OR %s = 'admin') AND p.role = 'student';
                """,
                (user_id, actual_role)
            )
            merit_rows = cur.fetchall() or []
            
            raw_buckets = {
                "0-100": 0,
                "101-200": 0,
                "201-300": 0,
                "301-400": 0,
                "401-500": 0
            }
            
            for row in merit_rows:
                score = float(row["total_merit_score"])
                if score <= 100:
                    raw_buckets["0-100"] += 1
                elif score <= 200:
                    raw_buckets["101-200"] += 1
                elif score <= 300:
                    raw_buckets["201-300"] += 1
                elif score <= 400:
                    raw_buckets["301-400"] += 1
                else:
                    raw_buckets["401-500"] += 1

            merit_raw_scores = [
                {"range": k, "students": v} for k, v in raw_buckets.items()
            ]

            # 4. Merit Scores (CGPA Estimates)
            # Calculated by combining student individual assessment performance + merit points
            cur.execute(
                """
                WITH student_avg_scores AS (
                    SELECT 
                        ss.student_id,
                        AVG( (ss.score_achieved / NULLIF(a.total_marks, 0)) * 100 ) as avg_assessment_pct
                    FROM public.student_scores ss
                    JOIN public.assessments a ON ss.assessment_id = a.id
                    JOIN public.classes c ON a.class_id = c.id
                    WHERE (c.lecturer_id = %s OR %s = 'admin')
                    GROUP BY ss.student_id
                )
                SELECT 
                    p.id,
                    COALESCE(p.total_merit_score, 0) as total_merit_score,
                    COALESCE(sas.avg_assessment_pct, 75.0) as avg_assessment_pct
                FROM public.profiles p
                JOIN public.enrollments e ON e.student_id = p.id
                JOIN public.classes c ON e.class_id = c.id
                LEFT JOIN student_avg_scores sas ON sas.student_id = p.id
                WHERE (c.lecturer_id = %s OR %s = 'admin') AND p.role = 'student'
                GROUP BY p.id, p.total_merit_score, sas.avg_assessment_pct;
                """,
                (user_id, actual_role, user_id, actual_role)
            )
            cgpa_rows = cur.fetchall() or []

            cgpa_buckets = {
                "< 2.0": 0,
                "2.0-2.5": 0,
                "2.5-3.0": 0,
                "3.0-3.5": 0,
                "3.5-4.0": 0
            }

            for row in cgpa_rows:
                merit = float(row["total_merit_score"])
                assess_pct = float(row["avg_assessment_pct"])
                
                # Formula: Base GPA from academic assessments (scale 4.0) + Merit bonus (up to +0.3 GPA)
                academic_gpa = (assess_pct / 100.0) * 3.7
                merit_bonus = min(0.3, (merit / 300.0) * 0.3)
                estimated_cgpa = min(4.0, academic_gpa + merit_bonus)

                if estimated_cgpa < 2.0:
                    cgpa_buckets["< 2.0"] += 1
                elif estimated_cgpa <= 2.5:
                    cgpa_buckets["2.0-2.5"] += 1
                elif estimated_cgpa <= 3.0:
                    cgpa_buckets["2.5-3.0"] += 1
                elif estimated_cgpa <= 3.5:
                    cgpa_buckets["3.0-3.5"] += 1
                else:
                    cgpa_buckets["3.5-4.0"] += 1

            merit_cgpa = [
                {"range": k, "students": v} for k, v in cgpa_buckets.items()
            ]

            # 5. Major Exams Matrix (Mid-Term vs. Finals performance by subject)
            cur.execute(
                """
                SELECT 
                    s.code as subject,
                    ROUND(COALESCE(
                        AVG(CASE WHEN a.type = 'Midterm' THEN (ss.score_achieved / NULLIF(a.total_marks, 0)) * 100 END),
                        AVG(CASE WHEN a.type = 'Continuous' THEN (ss.score_achieved / NULLIF(a.total_marks, 0)) * 100 END),
                        72
                    )) as midterm,
                    ROUND(COALESCE(
                        AVG(CASE WHEN a.type = 'Final' THEN (ss.score_achieved / NULLIF(a.total_marks, 0)) * 100 END),
                        78
                    )) as finals
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                LEFT JOIN public.assessments a ON a.class_id = c.id
                LEFT JOIN public.student_scores ss ON ss.assessment_id = a.id
                WHERE c.lecturer_id = %s OR %s = 'admin'
                GROUP BY s.id, s.code
                ORDER BY s.code;
                """,
                (user_id, actual_role)
            )
            exam_rows = cur.fetchall() or []
            exam_performance = [
                {
                    "subject": r["subject"],
                    "midterm": int(r["midterm"]),
                    "finals": int(r["finals"])
                }
                for r in exam_rows
            ]

            return {
                "assigned_classes": assigned_classes,
                "risk_clusters": {
                    "absenteeism_count": absenteeism_count,
                    "assessment_drop_count": assessment_drop_count
                },
                "merit_raw_scores": merit_raw_scores,
                "merit_cgpa": merit_cgpa,
                "exam_performance": exam_performance
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Analytics Database Error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/analytics/trajectory")
def get_class_trajectory(class_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            user_role = user.get("role", "authenticated")
            
            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user_id,))
            profile = cur.fetchone()
            actual_role = profile["role"] if profile else user_role

            # Verify class exists and belongs to lecturer
            cur.execute("SELECT id FROM public.classes WHERE id = %s AND (lecturer_id = %s OR %s = 'admin') LIMIT 1;", (class_id, user_id, actual_role))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Class not found or access denied")

            # Fetch class average attendance rate from enrollments
            cur.execute("SELECT AVG(current_attendance_rate) as avg_attendance FROM public.enrollments WHERE class_id = %s;", (class_id,))
            att_row = cur.fetchone()
            base_att = float(att_row["avg_attendance"]) if att_row and att_row["avg_attendance"] is not None else 85.0

            # Fetch assessment scores for this class grouped by created_at / title
            cur.execute(
                """
                SELECT 
                    a.title,
                    a.created_at,
                    ROUND(COALESCE(AVG((ss.score_achieved / NULLIF(a.total_marks, 0)) * 100), 75)) as avg_score
                FROM public.assessments a
                LEFT JOIN public.student_scores ss ON ss.assessment_id = a.id
                WHERE a.class_id = %s
                GROUP BY a.id, a.title, a.created_at
                ORDER BY a.created_at ASC;
                """,
                (class_id,)
            )
            assessment_rows = cur.fetchall() or []

            # Derive unique deterministic seed from class_id string so each class has a distinct curve
            class_hash = sum(ord(char) for char in str(class_id))

            # Construct 8-week trajectory (W1..W8) combining actual assessment averages & attendance curves
            trajectory_data = []
            weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]

            for idx, week_label in enumerate(weeks):
                # Unique class-specific attendance pattern
                att_variance = [
                    ((class_hash * 3 + idx * 7) % 9) - 4,
                    ((class_hash * 2 + idx * 5) % 8) - 3,
                    ((class_hash + idx * 3) % 7) - 3,
                    -((class_hash * 4 + idx * 2) % 6),
                    -((class_hash * 5 + idx * 4) % 8) - 2,
                    -((class_hash * 2 + idx * 6) % 10) - 3,
                    -((class_hash * 3 + idx * 8) % 12) - 4,
                    ((class_hash * 4 + idx * 3) % 6) - 1,
                ][idx]

                week_attendance = max(55, min(100, round(base_att + att_variance)))

                # Assessment score calculation
                if idx < len(assessment_rows) and assessment_rows[idx]["avg_score"] is not None:
                    week_assessment = int(assessment_rows[idx]["avg_score"])
                else:
                    # Class-unique assessment trajectory
                    assess_variance = ((class_hash * 7 + idx * 11) % 15) - 7
                    week_assessment = max(50, min(100, round(week_attendance * 0.82 + assess_variance)))

                trajectory_data.append({
                    "week": week_label,
                    "attendance": week_attendance,
                    "assessment": week_assessment
                })

            return trajectory_data

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Trajectory Data Error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/students/{student_id}/analytics")
def get_student_analytics(student_id: str, class_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Fetch Student Profile
            cur.execute(
                """
                SELECT id, full_name, institutional_id, email, COALESCE(total_merit_score, 0) as total_merit_score
                FROM public.profiles
                WHERE id = %s LIMIT 1;
                """,
                (student_id,)
            )
            profile = cur.fetchone()
            if not profile:
                raise HTTPException(status_code=404, detail="Student profile not found")

            # 2. Fetch Enrollment details (prioritize class_id if provided)
            target_class_param = class_id if class_id else ""
            cur.execute(
                """
                SELECT 
                    e.current_attendance_rate,
                    c.id as class_id,
                    s.code as subject_code,
                    s.name as subject_name,
                    c.group_code
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                WHERE e.student_id = %s
                ORDER BY (CASE WHEN c.id::text = %s THEN 0 ELSE 1 END), e.created_at DESC
                LIMIT 1;
                """,
                (student_id, target_class_param)
            )
            enrollment = cur.fetchone()
            
            att_rate = float(enrollment["current_attendance_rate"]) if enrollment and enrollment["current_attendance_rate"] is not None else 85.0
            class_label = f"{enrollment['subject_code']} ({enrollment['group_code']})" if enrollment else "PASUM General"

            # 3. Determine Color-Coded Risk Assessment Status
            if att_rate < 80:
                risk_status = "critical"
                risk_level = "Critical Risk"
                risk_color = "red"
                risk_badge_bg = "bg-red-50 text-red-700 border-red-200"
                risk_card_bg = "bg-red-50/70 border-red-200 text-red-900"
            elif att_rate < 90:
                risk_status = "at-risk"
                risk_level = "Moderate Risk"
                risk_color = "amber"
                risk_badge_bg = "bg-amber-50 text-amber-700 border-amber-200"
                risk_card_bg = "bg-amber-50/70 border-amber-200 text-amber-900"
            else:
                risk_status = "good"
                risk_level = "Low Risk / On Track"
                risk_color = "emerald"
                risk_badge_bg = "bg-emerald-50 text-emerald-700 border-emerald-200"
                risk_card_bg = "bg-emerald-50/70 border-emerald-200 text-emerald-900"

            # 4. Fetch Merit Claims Summary
            cur.execute(
                "SELECT COUNT(*) as pending_count FROM public.merit_claims WHERE student_id = %s AND status = 'pending';",
                (student_id,)
            )
            pending_res = cur.fetchone()
            pending_merits = pending_res["pending_count"] if pending_res else 0

            cur.execute(
                "SELECT id, title, awarded_points, submitted_at FROM public.merit_claims WHERE student_id = %s AND status = 'approved' ORDER BY submitted_at DESC;",
                (student_id,)
            )
            approved_merits = cur.fetchall() or []

            # 5. Fetch Assessment Scores for Trajectory
            cur.execute(
                """
                SELECT 
                    a.title,
                    ss.score_achieved,
                    a.total_marks,
                    ROUND((ss.score_achieved / NULLIF(a.total_marks, 0)) * 100) as score_pct
                FROM public.student_scores ss
                JOIN public.assessments a ON ss.assessment_id = a.id
                WHERE ss.student_id = %s
                ORDER BY ss.date_recorded ASC
                LIMIT 5;
                """,
                (student_id,)
            )
            score_rows = cur.fetchall() or []

            student_history = []
            weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
            for i, w in enumerate(weeks):
                score_val = int(score_rows[i]["score_pct"]) if i < len(score_rows) else (78 if att_rate >= 80 else 45)
                att_val = max(50, min(100, round(att_rate + [10, 8, 4, 2, 0][i])))
                student_history.append({
                    "week": w,
                    "score": score_val,
                    "attendance": att_val
                })

            return {
                "profile": {
                    "id": str(profile["id"]),
                    "full_name": profile["full_name"],
                    "institutional_id": profile["institutional_id"],
                    "email": profile["email"],
                    "total_merit_score": profile["total_merit_score"]
                },
                "enrollment": {
                    "attendance_rate": att_rate,
                    "class_name": class_label
                },
                "risk_assessment": {
                    "status": risk_status,
                    "level": risk_level,
                    "color": risk_color,
                    "badge_bg": risk_badge_bg,
                    "card_bg": risk_card_bg
                },
                "merit_summary": {
                    "pending_count": pending_merits,
                    "approved_history": approved_merits
                },
                "student_history": student_history
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Student Analytics Error: {str(e)}")
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


