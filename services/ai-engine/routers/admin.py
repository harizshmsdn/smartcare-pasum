from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from models.schemas import *
from core.database import get_db, get_db_connection

router = APIRouter(tags=["admin"])

@router.get("/api/admin/dashboard")
@router.get("/api/admin/users")
@router.post("/api/admin/users")
def create_admin_user(req: AdminUserCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
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
            
            conn.commit()
            return {"status": "success", "user_id": user_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.patch("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, req: AdminUserUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
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

            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
            # profiles is ON DELETE CASCADE referenced from auth.users
            cur.execute("DELETE FROM auth.users WHERE id = %s;", (user_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/admin/subjects")
@router.post("/api/admin/subjects")
def create_admin_subject(req: AdminSubjectCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
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

@router.get("/api/admin/classes")
@router.post("/api/admin/classes")
def create_admin_class(req: AdminClassCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
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

@router.delete("/api/admin/classes/{class_id}")
def delete_admin_class(class_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("DELETE FROM public.classes WHERE id = %s;", (class_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/admin/enrollments")
@router.post("/api/admin/enrollments")
def create_admin_enrollment(req: AdminEnrollmentRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
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
            conn.commit()
            return {"status": "success", "enrollment_id": e_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/api/admin/enrollments/{enrollment_id}")
def delete_admin_enrollment(enrollment_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
            cur.execute("DELETE FROM public.enrollments WHERE id = %s;", (enrollment_id,))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/admin/interventions")
@router.patch("/api/admin/interventions/{intervention_id}")
def update_admin_intervention(intervention_id: str, req: AdminInterventionUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
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


@router.get("/api/admin/merit-claims")
@router.patch("/api/admin/merit-claims/{claim_id}")
def review_admin_merit_claim(claim_id: str, req: AdminMeritReviewRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
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


@router.get("/api/admin/settings")
@router.post("/api/admin/settings")
def update_admin_settings(req: AdminSettingsUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            check_admin_auth(user, cur)
            ensure_system_settings_table(cur)
            
            data = req.dict()
            for key, value in data.items():
                cur.execute("""
                    INSERT INTO public.system_settings (key, value, updated_at)
                    VALUES (%s, %s, current_timestamp)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = current_timestamp;
                """, (key, json.dumps(value)))
                
            conn.commit()
            return {"status": "success", "message": "System configuration saved successfully."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


