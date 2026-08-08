from fastapi import HTTPException, Depends
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import json
from models.schemas import *
from core.auth import check_admin_auth, get_current_user
from core.database import get_db

def get_admin_users(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
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

# ----------------- USER MANAGEMENT -----------------
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
            cur.execute("""
                SELECT id, role, full_name, institutional_id, email, phone_number, office_location, affiliation, created_at 
                FROM public.profiles 
                ORDER BY role DESC, full_name ASC;
            """)
            users = cur.fetchall() or []
            return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_admin_user(req: AdminUserCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            if req.role == 'lecturer' and (not req.office_location or not req.office_location.strip()):
                raise HTTPException(status_code=400, detail="Office location is mandatory for lecturer accounts.")

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
            
            db.commit()
            return {"status": "success", "user_id": user_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def update_admin_user(user_id: str, req: AdminUserUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
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

            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def delete_admin_user(user_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            # profiles is ON DELETE CASCADE referenced from auth.users
            cur.execute("DELETE FROM auth.users WHERE id = %s;", (user_id,))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_admin_subjects(user: dict = Depends(get_current_user), db = Depends(get_db)):
# ----------------- CLASSES & SUBJECTS -----------------
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
            cur.execute("SELECT id, code, name, credit_hours, created_at FROM public.subjects ORDER BY code ASC;")
            subjects = cur.fetchall() or []
            return {"subjects": subjects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_admin_subject(req: AdminSubjectCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("""
                INSERT INTO public.subjects (code, name, credit_hours)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (req.code, req.name, req.credit_hours))
            sub_id = cur.fetchone()[0]
            db.commit()
            return {"status": "success", "subject_id": sub_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def get_admin_classes(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
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

def create_admin_class(req: AdminClassCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("""
                INSERT INTO public.classes (subject_id, lecturer_id, group_code, type, semester, day_of_week, start_time, end_time, location)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (req.subject_id, req.lecturer_id, req.group_code, req.type, req.semester, req.day_of_week, req.start_time, req.end_time, req.location))
            cls_id = cur.fetchone()[0]
            db.commit()
            return {"status": "success", "class_id": cls_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def delete_admin_class(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("DELETE FROM public.classes WHERE id = %s;", (class_id,))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_admin_enrollments(user: dict = Depends(get_current_user), db = Depends(get_db)):
# ----------------- SCHEDULES & ENROLLMENTS -----------------
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
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

def create_admin_enrollment(req: AdminEnrollmentRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
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
            db.commit()
            return {"status": "success", "enrollment_id": e_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def delete_admin_enrollment(enrollment_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("DELETE FROM public.enrollments WHERE id = %s;", (enrollment_id,))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_admin_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
# ----------------- INTERVENTIONS & CASES -----------------
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
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

def update_admin_intervention(intervention_id: str, req: AdminInterventionUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("""
                UPDATE public.interventions 
                SET status = %s, priority = %s, issue_description = %s
                WHERE id = %s;
            """, (req.status, req.priority, req.issue_description, intervention_id))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_admin_merit_claims(user: dict = Depends(get_current_user), db = Depends(get_db)):
# ----------------- MERIT CLAIMS -----------------
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
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

def review_admin_merit_claim(claim_id: str, req: AdminMeritReviewRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            # We want to verify evaluator_id is admin user's id
            cur.execute("""
                UPDATE public.merit_claims 
                SET status = %s, awarded_points = %s, evaluator_id = %s, verified_at = current_timestamp
                WHERE id = %s;
            """, (req.status, req.awarded_points, user["id"], claim_id))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ----------------- SYSTEM SETTINGS -----------------
DEFAULT_SYSTEM_SETTINGS = {
    "attendance_threshold": 80,
    "default_geofence_radius": 50,
    "grade_drop_threshold": 20,
    "mandatory_face_id": True,
    "mandatory_location": True,
    "max_merit_points_per_claim": 50.0,
    "default_merit_points_recommended": 10.0,
    "auto_email_absence_alert": True,
    "auto_escalate_intervention_days": 3,
    "maintenance_mode": False,
    "default_user_password": "password123",
    "session_timeout_hours": 12,
    "enable_audit_logs": True
}

def ensure_system_settings_table(cur, db = Depends(get_db)):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS public.system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
        );
    """)

def get_admin_settings(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            check_admin_auth(user, cur)
            ensure_system_settings_table(cur)
            cur.execute("SELECT key, value FROM public.system_settings;")
            rows = cur.fetchall() or []
            
            settings = dict(DEFAULT_SYSTEM_SETTINGS)
            for r in rows:
                k = r["key"]
                v = r["value"]
                if k in settings:
                    settings[k] = v
            return {"settings": settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def update_admin_settings(req: AdminSettingsUpdateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor() as cur:
            check_admin_auth(user, cur)
            ensure_system_settings_table(cur)
            
            data = req.dict()
            for key, value in data.items():
                cur.execute("""
                    INSERT INTO public.system_settings (key, value, updated_at)
                    VALUES (%s, %s, current_timestamp)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = current_timestamp;
                """, (key, json.dumps(value)))
                
            db.commit()
            return {"status": "success", "message": "System configuration saved successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


