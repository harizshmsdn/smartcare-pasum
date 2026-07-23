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

class AssessmentCreateRequest(BaseModel):
    title: str
    type: str  # 'Continuous', 'Midterm', 'Final'
    weightage: float
    total_marks: int

class ScoreSaveRequest(BaseModel):
    student_id: str
    score_achieved: float

class StudentMeritClaimRequest(BaseModel):
    title: str
    category: str = "General"
    awarded_points: float = 10.0
    description: Optional[str] = ""
    proof_file_url: Optional[str] = ""

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


@app.get("/api/alerts")
def get_alerts(filter: Optional[str] = "all", user: dict = Depends(get_current_user)):
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
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Alerts Database Error: {str(e)}")
    finally:
        conn.close()


@app.patch("/api/alerts/{alert_id}/read")
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


@app.post("/api/alerts/mark-all-read")
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


@app.get("/api/classes/{class_id}/assessments")
def get_class_assessments(class_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Assessments Fetch Error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/classes/{class_id}/assessments")
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


@app.post("/api/assessments/{assessment_id}/scores")
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


# ==============================================================================
# STUDENT SPECIFIC ENDPOINTS
# ==============================================================================

@app.get("/api/student/dashboard")
def get_student_dashboard_analytics(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]

            # 1. Fetch Profile Total Merits
            cur.execute(
                "SELECT full_name, COALESCE(total_merit_score, 0) as total_merit_score FROM public.profiles WHERE id = %s LIMIT 1;",
                (student_id,)
            )
            profile = cur.fetchone()
            if not profile:
                raise HTTPException(status_code=404, detail="Student profile not found")

            total_merits = float(profile["total_merit_score"])

            # 2. Fetch Enrollments & Class details
            cur.execute(
                """
                SELECT 
                    e.class_id,
                    e.current_attendance_rate,
                    c.group_code,
                    s.code as subject_code,
                    s.name as subject_name
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                WHERE e.student_id = %s
                ORDER BY s.code ASC;
                """,
                (student_id,)
            )
            enrollments = cur.fetchall() or []

            subjects_list = [r["subject_code"] for r in enrollments]

            class_attendance = [
                {
                    "subject": r["subject_code"],
                    "attendance": round(float(r["current_attendance_rate"])) if r["current_attendance_rate"] is not None else 85
                }
                for r in enrollments
            ]

            # 3. Timelines & CA Performance Data per subject
            subject_timelines = {}
            ca_performance_data = {}
            exam_performance = []
            ranked_subjects = []

            for r in enrollments:
                class_id = r["class_id"]
                code = r["subject_code"]
                att_rate = float(r["current_attendance_rate"]) if r["current_attendance_rate"] is not None else 85.0

                # Fetch student assessment scores for this class
                cur.execute(
                    """
                    SELECT 
                        a.title,
                        a.type,
                        a.total_marks,
                        ss.score_achieved,
                        ROUND((ss.score_achieved / NULLIF(a.total_marks, 0)) * 100) as score_pct
                    FROM public.assessments a
                    LEFT JOIN public.student_scores ss ON ss.assessment_id = a.id AND ss.student_id = %s
                    WHERE a.class_id = %s
                    ORDER BY a.created_at ASC;
                    """,
                    (student_id, class_id)
                )
                assess_rows = cur.fetchall() or []

                ca_list = []
                midterm_pct = None
                finals_pct = None
                score_sum = 0
                score_cnt = 0

                for row in assess_rows:
                    pct = float(row["score_pct"]) if row["score_pct"] is not None else (75.0 if att_rate >= 80 else 55.0)
                    ca_list.append({
                        "name": row["title"],
                        "score": round(pct, 1)
                    })
                    score_sum += pct
                    score_cnt += 1

                    if row["type"] == "Midterm":
                        midterm_pct = pct
                    elif row["type"] == "Final":
                        finals_pct = pct

                if not ca_list:
                    ca_list = [
                        {"name": "Quiz 1", "score": round(60.0 if att_rate < 80 else 85.0, 1)},
                        {"name": "Quiz 2", "score": round(55.0 if att_rate < 80 else 90.0, 1)},
                        {"name": "Midterm", "score": round(58.0 if att_rate < 80 else 82.0, 1)},
                        {"name": "Assignment", "score": round(70.0 if att_rate < 80 else 88.0, 1)}
                    ]

                ca_avg = (score_sum / score_cnt) if score_cnt > 0 else (65.0 if att_rate < 80 else 85.0)
                ca_performance_data[code] = ca_list

                # 7-week trajectory curve
                class_hash = sum(ord(char) for char in str(class_id))
                weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"]
                timeline = []
                att_offsets = [10, 8, 5, 2, 0, -2, 0]
                assess_offsets = [5, 4, 2, 0, -3, -1, 0]

                for idx, week_label in enumerate(weeks):
                    w_att = max(60, min(100, round(att_rate + att_offsets[idx] + ((class_hash + idx) % 5 - 2))))
                    w_assess = max(50, min(100, round(ca_avg + assess_offsets[idx] + ((class_hash + idx * 3) % 7 - 3))))
                    timeline.append({
                        "week": week_label,
                        "attendance": w_att,
                        "assessment": w_assess
                    })

                subject_timelines[code] = timeline

                m_score = round(midterm_pct if midterm_pct is not None else (58 if att_rate < 80 else 82))
                f_score = round(finals_pct if finals_pct is not None else (m_score + 4))
                exam_performance.append({
                    "subject": code,
                    "midterm": m_score,
                    "finals": f_score
                })

                weighted_score = round((att_rate * 0.6) + (ca_avg * 0.4), 1)
                grade = "A" if weighted_score >= 85 else ("B" if weighted_score >= 75 else ("C" if weighted_score >= 65 else "D"))
                ranked_subjects.append({
                    "subject": code,
                    "score": weighted_score,
                    "grade": grade
                })

            ranked_subjects.sort(key=lambda x: x["score"], reverse=True)

            return {
                "total_merits": total_merits,
                "subjects_list": subjects_list,
                "class_attendance": class_attendance,
                "subject_timelines": subject_timelines,
                "ca_performance_data": ca_performance_data,
                "exam_performance": exam_performance,
                "ranked_subjects": ranked_subjects
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Student Dashboard Analytics Error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/student/classes/{class_id}/details")
def get_student_class_details(class_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]

            cur.execute(
                """
                SELECT 
                    c.id, c.group_code, c.type, c.semester, c.day_of_week, c.start_time, c.end_time, c.location,
                    s.code as subject_code, s.name as subject_name,
                    p.full_name as lecturer_name, p.email as lecturer_email, p.phone_number as lecturer_phone,
                    p.office_location as lecturer_office, p.affiliation as lecturer_affiliation
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                JOIN public.profiles p ON c.lecturer_id = p.id
                WHERE c.id = %s LIMIT 1;
                """,
                (class_id,)
            )
            class_row = cur.fetchone()
            if not class_row:
                raise HTTPException(status_code=404, detail="Class not found")

            cur.execute(
                "SELECT current_attendance_rate FROM public.enrollments WHERE class_id = %s AND student_id = %s LIMIT 1;",
                (class_id, student_id)
            )
            enroll_row = cur.fetchone()
            att_rate = round(float(enroll_row["current_attendance_rate"])) if enroll_row and enroll_row["current_attendance_rate"] is not None else 100

            def fmt_time(t_str):
                if not t_str: return ""
                parts = str(t_str).split(":")
                hr = int(parts[0])
                mn = parts[1]
                ampm = "PM" if hr >= 12 else "AM"
                d_hr = 12 if hr % 12 == 0 else hr % 12
                return f"{d_hr}:{mn} {ampm}"

            time_range = f"{fmt_time(class_row['start_time'])} - {fmt_time(class_row['end_time'])}" if class_row["start_time"] else "10:00 AM - 12:00 PM"
            schedule_text = f"{class_row['day_of_week'] or 'Wednesday'} • {time_range}"

            cur.execute(
                """
                SELECT 
                    s.id as session_id,
                    s.opened_at,
                    s.session_pin,
                    r.status,
                    r.timestamp,
                    r.face_verified,
                    r.location_verified,
                    r.manual_override
                FROM public.attendance_sessions s
                LEFT JOIN public.attendance_records r ON r.session_id = s.id AND r.student_id = %s
                WHERE s.class_id = %s
                ORDER BY s.opened_at DESC;
                """,
                (student_id, class_id)
            )
            sess_rows = cur.fetchall() or []

            attendance_log = []
            for s in sess_rows:
                dt_str = s["opened_at"].strftime("%d %B %Y") if s["opened_at"] else "N/A"
                methods = []
                if s["face_verified"]: methods.append("Face ID")
                if s["location_verified"]: methods.append("GPS")
                if s["manual_override"]: methods.append("Manual Override")

                attendance_log.append({
                    "id": str(s["session_id"]),
                    "date": dt_str,
                    "pin": s["session_pin"] or "PIN-OK",
                    "status": s["status"] or "Absent",
                    "verifiedMethods": methods
                })

            cur.execute(
                """
                SELECT 
                    a.id,
                    a.title,
                    a.type,
                    a.weightage,
                    a.total_marks,
                    COALESCE(ss.score_achieved, 0) as score_achieved
                FROM public.assessments a
                LEFT JOIN public.student_scores ss ON ss.assessment_id = a.id AND ss.student_id = %s
                WHERE a.class_id = %s
                ORDER BY a.created_at ASC;
                """,
                (student_id, class_id)
            )
            assess_rows = cur.fetchall() or []

            assessments = []
            score_sum = 0
            cnt = 0
            for a in assess_rows:
                score_val = float(a["score_achieved"])
                assessments.append({
                    "id": str(a["id"]),
                    "title": a["title"],
                    "type": a["type"],
                    "weightage": float(a["weightage"]),
                    "score": score_val,
                    "totalMarks": int(a["total_marks"])
                })
                if a["total_marks"] > 0:
                    pct = (score_val / float(a["total_marks"])) * 100
                    score_sum += pct
                    cnt += 1

            ca_avg = (score_sum / cnt) if cnt > 0 else (65.0 if att_rate < 80 else 88.0)
            performance_numeric = round((att_rate * 0.6) + (ca_avg * 0.4))

            lecturer_info = {
                "full_name": class_row["lecturer_name"],
                "email": class_row["lecturer_email"],
                "phone_number": class_row["lecturer_phone"],
                "office_location": class_row["lecturer_office"],
                "affiliation": class_row["lecturer_affiliation"]
            }

            return {
                "lecturerInfo": lecturer_info,
                "classScheduleText": schedule_text,
                "attendanceRate": att_rate,
                "performanceNumeric": performance_numeric,
                "attendanceLog": attendance_log,
                "assessments": assessments
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Student Class Details Error: {str(e)}")
    finally:
        conn.close()


@app.get("/api/student/alerts")
def get_student_alerts(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]

            cur.execute(
                """
                SELECT 
                    a.id,
                    a.type,
                    a.priority,
                    a.message,
                    a.is_read,
                    a.created_at,
                    s.name as course_name
                FROM public.alerts a
                LEFT JOIN public.classes c ON a.class_id = c.id
                LEFT JOIN public.subjects s ON c.subject_id = s.id
                WHERE a.student_id = %s
                ORDER BY a.created_at DESC;
                """,
                (student_id,)
            )
            rows = cur.fetchall() or []

            now_ms = datetime.utcnow().timestamp() * 1000
            formatted = []
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

                formatted.append({
                    "id": str(r["id"]),
                    "course": r["course_name"] or "General",
                    "type": r["type"] or "system",
                    "priority": r["priority"] or "medium",
                    "message": r["message"] or "",
                    "timestamp": time_str,
                    "isRead": is_read
                })

            return {
                "unread_count": unread_count,
                "alerts": formatted
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Student Alerts Error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/student/alerts/mark-all-read")
def mark_all_student_alerts_read(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            cur.execute("UPDATE public.alerts SET is_read = true WHERE student_id = %s;", (student_id,))
            conn.commit()
            return {"status": "success", "message": "All student alerts marked as read."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mark All Student Read Error: {str(e)}")
    finally:
        conn.close()


@app.patch("/api/student/alerts/{alert_id}/read")
def mark_student_alert_read(alert_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
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


@app.get("/api/student/merit-claims")
def get_student_merit_claims(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            cur.execute(
                """
                SELECT id, title, category, awarded_points, description, proof_file_url, status, submitted_at
                FROM public.merit_claims
                WHERE student_id = %s
                ORDER BY submitted_at DESC;
                """,
                (student_id,)
            )
            claims = cur.fetchall() or []
            return {"claims": claims}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Get Merit Claims Error: {str(e)}")
    finally:
        conn.close()


@app.post("/api/student/merit-claims")
def create_student_merit_claim(req: StudentMeritClaimRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
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


@app.get("/api/student/interventions")
def get_student_interventions(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            cur.execute(
                """
                SELECT 
                    i.id, i.issue_description, i.status, i.priority, i.created_at,
                    p.full_name as lecturer_name, p.email as lecturer_email,
                    c.group_code, s.code as subject_code, s.name as subject_name
                FROM public.interventions i
                JOIN public.profiles p ON i.lecturer_id = p.id
                JOIN public.classes c ON i.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                WHERE i.student_id = %s AND i.status != 'resolved'
                ORDER BY i.created_at DESC;
                """,
                (student_id,)
            )
            interventions = cur.fetchall() or []
            return {"interventions": interventions}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Get Interventions Error: {str(e)}")
    finally:
        conn.close()


import uuid
import json

class AdminUserCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    institutional_id: Optional[str] = None
    phone_number: Optional[str] = None
    office_location: Optional[str] = None
    affiliation: Optional[str] = None

class AdminUserUpdateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    institutional_id: Optional[str] = None
    phone_number: Optional[str] = None
    office_location: Optional[str] = None
    affiliation: Optional[str] = None

class AdminSubjectCreateRequest(BaseModel):
    code: str
    name: str
    credit_hours: int

class AdminClassCreateRequest(BaseModel):
    subject_id: str
    lecturer_id: str
    group_code: str
    type: str
    semester: str
    day_of_week: str
    start_time: str
    end_time: str
    location: str

class AdminEnrollmentRequest(BaseModel):
    student_id: str
    class_id: str

class AdminInterventionUpdateRequest(BaseModel):
    status: str
    priority: str
    issue_description: str

class AdminMeritReviewRequest(BaseModel):
    status: str
    awarded_points: float

def check_admin_auth(user: dict):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user["id"],))
            p = cur.fetchone()
            role = p[0] if p else None
            if role != 'admin':
                raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")
    finally:
        conn.close()

# ----------------- ADMIN DASHBOARD & METRICS -----------------
@app.get("/api/admin/dashboard")
def get_admin_dashboard(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. KPIs
            cur.execute("SELECT COUNT(*) FROM public.profiles WHERE role = 'student';")
            students_count = cur.fetchone()["count"]

            cur.execute("SELECT COUNT(*) FROM public.profiles WHERE role = 'lecturer';")
            lecturers_count = cur.fetchone()["count"]

            cur.execute("SELECT COUNT(*) FROM public.classes;")
            classes_count = cur.fetchone()["count"]

            cur.execute("SELECT COALESCE(AVG(current_attendance_rate), 0) AS avg_rate FROM public.enrollments;")
            avg_attendance = float(cur.fetchone()["avg_rate"])

            # 2. Real check-in success rate from database
            cur.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE status IN ('Present', 'Late', 'Excused')) as success, 
                    COUNT(*) as total 
                FROM public.attendance_records;
            """)
            rec = cur.fetchone()
            success_count = rec["success"] or 0
            total_records = rec["total"] or 0
            checkin_success_rate = round((success_count / total_records * 100), 1) if total_records > 0 else 100.0

            # 3. Weekly check-in volume (last 7 days) from database
            cur.execute("""
                SELECT 
                  to_char(day_series, 'Dy') as day_label,
                  COALESCE(COUNT(r.id), 0)::int as checkins_count
                FROM generate_series(current_date - interval '6 days', current_date, '1 day') AS day_series
                LEFT JOIN public.attendance_records r ON date(r.timestamp) = date(day_series)
                GROUP BY day_series
                ORDER BY day_series ASC;
            """)
            checkin_history = cur.fetchall() or []
            daily_checkins = [{"day": row["day_label"], "count": row["checkins_count"]} for row in checkin_history]

            # 4. Real Database metrics
            cur.execute("SELECT COUNT(*) FROM public.profiles;")
            total_profiles = cur.fetchone()["count"] or 0

            cur.execute("SELECT COUNT(*) FROM public.merit_claims WHERE status = 'pending';")
            pending_claims_count = cur.fetchone()["count"] or 0

            cur.execute("SELECT COUNT(*) FROM public.interventions WHERE status != 'resolved';")
            active_interventions_count = cur.fetchone()["count"] or 0

            cur.execute("SELECT COUNT(*) FROM public.alerts WHERE is_read = false;")
            unread_alerts_count = cur.fetchone()["count"] or 0

            # 5. Real site visits / active session metrics from Supabase auth logs
            cur.execute("SELECT COUNT(*)::int FROM auth.users WHERE last_sign_in_at > current_timestamp - interval '24 hours';")
            active_today = cur.fetchone()["count"] or 0

            cur.execute("SELECT COUNT(*)::int FROM auth.users WHERE last_sign_in_at > current_timestamp - interval '7 days';")
            active_weekly = cur.fetchone()["count"] or 0
            
            # Fetch recent merit claims and interventions for general overview
            cur.execute("""
                SELECT c.id, c.title, c.status, p.full_name as student_name 
                FROM public.merit_claims c 
                JOIN public.profiles p ON c.student_id = p.id 
                ORDER BY c.submitted_at DESC LIMIT 5;
            """)
            recent_claims = cur.fetchall() or []

            cur.execute("""
                SELECT i.id, i.issue_description, i.status, p.full_name as student_name 
                FROM public.interventions i 
                JOIN public.profiles p ON i.student_id = p.id 
                ORDER BY i.created_at DESC LIMIT 5;
            """)
            recent_interventions = cur.fetchall() or []

            return {
                "stats": {
                    "total_students": students_count,
                    "total_lecturers": lecturers_count,
                    "total_classes": classes_count,
                    "avg_attendance": round(avg_attendance, 1)
                },
                "metrics": {
                    "daily_checkins": daily_checkins,
                    "checkin_success_rate": checkin_success_rate,
                    "total_profiles": total_profiles,
                    "pending_claims_count": pending_claims_count,
                    "active_interventions_count": active_interventions_count,
                    "unread_alerts_count": unread_alerts_count,
                    "active_today": active_today,
                    "active_weekly": active_weekly
                },
                "recent_claims": recent_claims,
                "recent_interventions": recent_interventions
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ----------------- USER MANAGEMENT -----------------
@app.get("/api/admin/users")
def get_admin_users(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, role, full_name, institutional_id, email, phone_number, office_location, affiliation, created_at 
                FROM public.profiles 
                ORDER BY role DESC, full_name ASC;
            """)
            users = cur.fetchall() or []
            return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/admin/users")
def create_admin_user(req: AdminUserCreateRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if email is already taken
            cur.execute("SELECT id FROM public.profiles WHERE email = %s LIMIT 1;", (req.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already exists.")

            user_id = str(uuid.uuid4())
            # Insert into auth.users (default password is 'password123')
            cur.execute("""
                INSERT INTO auth.users (
                  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
                ) VALUES (
                  %s, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', %s, crypt('password123', gen_salt('bf')), current_timestamp, %s, '{}', current_timestamp, current_timestamp
                );
            """, (user_id, req.email, json.dumps({"provider": "email", "providers": ["email"], "role": req.role})))

            # Insert into auth.identities
            cur.execute("""
                INSERT INTO auth.identities (
                  id, provider_id, user_id, identity_data, provider, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), %s, %s, %s, 'email', current_timestamp, current_timestamp
                );
            """, (req.email, user_id, json.dumps({"sub": user_id, "email": req.email})))

            # Insert into public.profiles
            cur.execute("""
                INSERT INTO public.profiles (
                  id, role, full_name, institutional_id, email, phone_number, office_location, affiliation
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (user_id, req.role, req.full_name, req.institutional_id, req.email, req.phone_number, req.office_location, req.affiliation))
            
            conn.commit()
            return {"status": "success", "user_id": user_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, req: AdminUserUpdateRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.profiles 
                SET role = %s, full_name = %s, institutional_id = %s, email = %s, phone_number = %s, office_location = %s, affiliation = %s
                WHERE id = %s;
            """, (req.role, req.full_name, req.institutional_id, req.email, req.phone_number, req.office_location, req.affiliation, user_id))

            cur.execute("""
                UPDATE auth.users 
                SET email = %s, raw_app_meta_data = %s
                WHERE id = %s;
            """, (req.email, json.dumps({"provider": "email", "providers": ["email"], "role": req.role}), user_id))

            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: str, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # profiles is ON DELETE CASCADE referenced from auth.users
            cur.execute("DELETE FROM auth.users WHERE id = %s;", (user_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ----------------- CLASSES & SUBJECTS -----------------
@app.get("/api/admin/subjects")
def get_admin_subjects(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, code, name, credit_hours, created_at FROM public.subjects ORDER BY code ASC;")
            subjects = cur.fetchall() or []
            return {"subjects": subjects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/admin/subjects")
def create_admin_subject(req: AdminSubjectCreateRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO public.subjects (code, name, credit_hours)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (req.code, req.name, req.credit_hours))
            sub_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "subject_id": sub_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/admin/classes")
def get_admin_classes(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    c.id, c.group_code, c.type, c.semester, c.day_of_week, c.start_time, c.end_time, c.location,
                    s.code as subject_code, s.name as subject_name, s.id as subject_id,
                    p.full_name as lecturer_name, p.id as lecturer_id
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                JOIN public.profiles p ON c.lecturer_id = p.id
                ORDER BY s.code ASC, c.group_code ASC;
            """)
            classes = cur.fetchall() or []
            return {"classes": classes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/admin/classes")
def create_admin_class(req: AdminClassCreateRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO public.classes (subject_id, lecturer_id, group_code, type, semester, day_of_week, start_time, end_time, location)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (req.subject_id, req.lecturer_id, req.group_code, req.type, req.semester, req.day_of_week, req.start_time, req.end_time, req.location))
            cls_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "class_id": cls_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/admin/classes/{class_id}")
def delete_admin_class(class_id: str, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM public.classes WHERE id = %s;", (class_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ----------------- SCHEDULES & ENROLLMENTS -----------------
@app.get("/api/admin/enrollments")
def get_admin_enrollments(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    e.id as enrollment_id, e.current_attendance_rate,
                    c.id as class_id, c.group_code, s.code as subject_code, s.name as subject_name,
                    p.full_name as student_name, p.id as student_id, p.institutional_id as student_inst_id
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                JOIN public.profiles p ON e.student_id = p.id
                ORDER BY s.code ASC, c.group_code ASC, p.full_name ASC;
            """)
            enrollments = cur.fetchall() or []
            return {"enrollments": enrollments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/admin/enrollments")
def create_admin_enrollment(req: AdminEnrollmentRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if student is already enrolled
            cur.execute("SELECT id FROM public.enrollments WHERE student_id = %s AND class_id = %s LIMIT 1;", (req.student_id, req.class_id))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Student is already enrolled in this class.")

            cur.execute("""
                INSERT INTO public.enrollments (student_id, class_id, current_attendance_rate)
                VALUES (%s, %s, 100)
                RETURNING id;
            """, (req.student_id, req.class_id))
            e_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "success", "enrollment_id": e_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/admin/enrollments/{enrollment_id}")
def delete_admin_enrollment(enrollment_id: str, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM public.enrollments WHERE id = %s;", (enrollment_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ----------------- INTERVENTIONS & CASES -----------------
@app.get("/api/admin/interventions")
def get_admin_interventions(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    i.id as intervention_id, i.issue_description, i.status, i.priority, i.created_at, i.updated_at,
                    p_stud.full_name as student_name, p_stud.id as student_id, p_stud.institutional_id as student_inst_id,
                    p_lect.full_name as lecturer_name,
                    s.code as subject_code, c.group_code
                FROM public.interventions i
                JOIN public.profiles p_stud ON i.student_id = p_stud.id
                JOIN public.profiles p_lect ON i.lecturer_id = p_lect.id
                JOIN public.classes c ON i.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                ORDER BY i.created_at DESC;
            """)
            interventions = cur.fetchall() or []
            return {"interventions": interventions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/api/admin/interventions/{intervention_id}")
def update_admin_intervention(intervention_id: str, req: AdminInterventionUpdateRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.interventions 
                SET status = %s, priority = %s, issue_description = %s
                WHERE id = %s;
            """, (req.status, req.priority, req.issue_description, intervention_id))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ----------------- MERIT CLAIMS -----------------
@app.get("/api/admin/merit-claims")
def get_admin_merit_claims(user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    m.id as claim_id, m.title, m.category, m.proof_file_url, m.status, m.awarded_points, m.submitted_at,
                    p.full_name as student_name, p.id as student_id, p.institutional_id as student_inst_id
                FROM public.merit_claims m
                JOIN public.profiles p ON m.student_id = p.id
                ORDER BY m.submitted_at DESC;
            """)
            claims = cur.fetchall() or []
            return {"claims": claims}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.patch("/api/admin/merit-claims/{claim_id}")
def review_admin_merit_claim(claim_id: str, req: AdminMeritReviewRequest, user: dict = Depends(get_current_user)):
    check_admin_auth(user)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # We want to verify evaluator_id is admin user's id
            cur.execute("""
                UPDATE public.merit_claims 
                SET status = %s, awarded_points = %s, evaluator_id = %s, verified_at = current_timestamp
                WHERE id = %s;
            """, (req.status, req.awarded_points, user["id"], claim_id))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)





