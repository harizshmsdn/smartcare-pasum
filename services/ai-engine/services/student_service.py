from fastapi import HTTPException, Depends
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import json
from datetime import datetime, timedelta, timezone
from models.schemas import *
from core.auth import check_user_auth, check_admin_auth, get_current_user
from core.database import get_db

def get_student_dashboard_analytics(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]

            # 1. Fetch Profile Total Merits & Verify Student Role
            profile = check_user_auth(cur, student_id, "student")
            total_merits = float(profile.get("total_merit_score") or 0)

            # 2. Fetch Enrollments & Class details
            cur.execute(
                """
                SELECT 
                    e.class_id,
                    e.current_attendance_rate,
                    c.group_code,
                    c.type,
                    c.day_of_week,
                    c.start_time,
                    c.end_time,
                    c.location,
                    s.code as subject_code,
                    s.name as subject_name,
                    p.full_name as lecturer_name
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                JOIN public.subjects s ON c.subject_id = s.id
                LEFT JOIN public.profiles p ON c.lecturer_id = p.id
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
                    "attendance": round(float(r["current_attendance_rate"])) if r["current_attendance_rate"] is not None else 0
                }
                for r in enrollments
            ]

            # 3. Timelines & CA Performance Data per subject (real data only)
            subject_timelines = {}
            ca_performance_data = {}
            exam_performance = []
            ranked_subjects = []

            for r in enrollments:
                class_id = r["class_id"]
                code = r["subject_code"]
                att_rate = float(r["current_attendance_rate"]) if r["current_attendance_rate"] is not None else 0.0

                # Fetch real attendance sessions for student
                cur.execute(
                    """
                    SELECT 
                        s.id,
                        s.opened_at,
                        CASE 
                            WHEN LOWER(r.status::text) = 'present' THEN 100
                            WHEN LOWER(r.status::text) = 'late' THEN 50
                            WHEN LOWER(r.status::text) = 'excused' THEN 100
                            WHEN r.status IS NOT NULL THEN 0
                            ELSE NULL
                        END as att_rate
                    FROM public.attendance_sessions s
                    LEFT JOIN public.attendance_records r ON r.session_id = s.id AND r.student_id = %s
                    WHERE s.class_id = %s
                    ORDER BY s.opened_at ASC;
                    """,
                    (student_id, class_id)
                )
                session_rows = cur.fetchall() or []

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
                    JOIN public.student_scores ss ON ss.assessment_id = a.id AND ss.student_id = %s
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
                    if row["score_pct"] is not None:
                        pct = float(row["score_pct"])
                        ca_list.append({
                            "name": row["title"],
                            "score": round(pct, 1)
                        })
                        score_sum += pct
                        score_cnt += 1

                        if row.get("type") == "Midterm":
                            midterm_pct = pct
                        elif row.get("type") == "Final":
                            finals_pct = pct

                ca_performance_data[code] = ca_list

                # Build real trajectory curve
                timeline = []
                total_points = max(len(session_rows), len(assess_rows))
                for idx in range(total_points):
                    week_label = f"W{idx + 1}"
                    att_val = int(session_rows[idx]["att_rate"]) if idx < len(session_rows) and session_rows[idx]["att_rate"] is not None else None
                    assess_val = int(assess_rows[idx]["score_pct"]) if idx < len(assess_rows) and assess_rows[idx]["score_pct"] is not None else None

                    if att_val is not None or assess_val is not None:
                        timeline.append({
                            "week": week_label,
                            "attendance": att_val,
                            "assessment": assess_val
                        })

                subject_timelines[code] = timeline

                if midterm_pct is not None or finals_pct is not None:
                    exam_performance.append({
                        "subject": code,
                        "midterm": round(midterm_pct) if midterm_pct is not None else 0,
                        "finals": round(finals_pct) if finals_pct is not None else 0
                    })

                if score_cnt > 0:
                    ca_avg = score_sum / score_cnt
                    if r["current_attendance_rate"] is not None and float(r["current_attendance_rate"]) > 0:
                        weighted_score = round((float(r["current_attendance_rate"]) * 0.6) + (ca_avg * 0.4), 1)
                    else:
                        weighted_score = round(ca_avg, 1)
                    grade = "A" if weighted_score >= 85 else ("B" if weighted_score >= 75 else ("C" if weighted_score >= 65 else "D"))
                    ranked_subjects.append({
                        "subject": code,
                        "score": weighted_score,
                        "grade": grade
                    })

            ranked_subjects.sort(key=lambda x: x["score"], reverse=True)

            assigned_classes = []
            for r in enrollments:
                att_rate = float(r["current_attendance_rate"]) if r["current_attendance_rate"] is not None else 0.0
                risk_status = "Critical" if att_rate < 80 else ("Watch" if att_rate < 90 else "Good")
                
                # We reuse the ca_performance_data for the latest score
                latest_score = 0
                ca_list = ca_performance_data.get(r["subject_code"], [])
                if ca_list:
                    latest_score = ca_list[-1]["score"]
                
                def fmt_time_str(t_str):
                    if not t_str: return ""
                    parts = str(t_str).split(":")
                    hr = int(parts[0])
                    mn = parts[1]
                    ampm = "PM" if hr >= 12 else "AM"
                    d_hr = 12 if hr % 12 == 0 else hr % 12
                    return f"{d_hr}:{mn} {ampm}"

                t_range = f"{fmt_time_str(r.get('start_time'))} - {fmt_time_str(r.get('end_time'))}" if r.get("start_time") else "10:00 AM - 12:00 PM"

                assigned_classes.append({
                    "id": str(r["class_id"]),
                    "title": r["subject_name"],
                    "name": r["subject_name"],
                    "group": r["group_code"],
                    "code": r["group_code"],
                    "subject": r["subject_code"],
                    "lecturer": r.get("lecturer_name") or "Unknown",
                    "location": r.get("location") or "PASUM Campus",
                    "status": "Enrolled",
                    "time": t_range,
                    "attendance": att_rate,
                    "latestScore": latest_score,
                    "riskStatus": risk_status,
                    "type": r.get("type") or "Lecture",
                    "dayOfWeek": r.get("day_of_week") or "Monday",
                    "startTime": str(r["start_time"]) if r.get("start_time") else "10:00:00",
                    "endTime": str(r["end_time"]) if r.get("end_time") else "12:00:00"
                })

            return {
                "profile": {
                    "id": str(profile["id"]),
                    "full_name": profile.get("full_name") or "Student",
                    "email": profile.get("email") or "",
                    "institutional_id": profile.get("institutional_id") or "",
                    "phone_number": profile.get("phone_number") or "",
                    "emergency_contact": profile.get("emergency_contact") or ""
                },
                "total_merits": 0,
                "subjects_list": subjects_list,
                "class_attendance": class_attendance,
                "subject_timelines": subject_timelines,
                "ca_performance_data": ca_performance_data,
                "exam_performance": exam_performance,
                "ranked_subjects": ranked_subjects,
                "assigned_classes": assigned_classes
            }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Student Dashboard Analytics Error: {str(e)}")


def get_student_class_details(class_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            # Verify student role
            check_user_auth(cur, student_id, "student")

            cur.execute(
                """
                SELECT 
                    c.id, c.group_code, c.type, c.semester, c.day_of_week, c.start_time, c.end_time, c.location,
                    s.code as subject_code, s.name as subject_name,
                    p.full_name as lecturer_name, p.email as lecturer_email, p.phone_number as lecturer_phone,
                    p.office_location as lecturer_office, p.affiliation as lecturer_affiliation
                FROM public.classes c
                JOIN public.subjects s ON c.subject_id = s.id
                LEFT JOIN public.profiles p ON c.lecturer_id = p.id
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
            if not enroll_row:
                raise HTTPException(status_code=403, detail="Access denied: Student is not enrolled in this class")

            def fmt_time(t_str):
                if not t_str: return ""
                parts = str(t_str).split(":")
                hr = int(parts[0])
                mn = parts[1]
                ampm = "PM" if hr >= 12 else "AM"
                d_hr = 12 if hr % 12 == 0 else hr % 12
                return f"{d_hr}:{mn} {ampm}"

            time_range = f"{fmt_time(class_row.get('start_time'))} - {fmt_time(class_row.get('end_time'))}" if class_row.get("start_time") else "10:00 AM - 12:00 PM"
            schedule_text = f"{class_row.get('day_of_week') or 'Wednesday'} • {time_range}"

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

            # Determine attendance rate accurately based on attendance records
            total_sessions = len(sess_rows)
            has_student_records = any(s.get("status") is not None for s in sess_rows)
            attended_cnt = sum(1 for s in sess_rows if s.get("status") and str(s.get("status", "")).lower() in ["present", "excused"])
            has_attendance_data = total_sessions > 0 and has_student_records
            att_rate = round((attended_cnt / total_sessions) * 100) if has_attendance_data else 0

            attendance_log = []
            for s in sess_rows:
                dt_str = s["opened_at"].strftime("%d %B %Y") if s.get("opened_at") else "N/A"
                methods = []
                if s.get("face_verified"): methods.append("Face ID")
                if s.get("location_verified"): methods.append("GPS")
                if s.get("manual_override"): methods.append("Manual Override")

                attendance_log.append({
                    "id": str(s["session_id"]),
                    "date": dt_str,
                    "pin": s.get("session_pin") or "PIN-OK",
                    "status": s.get("status") or "Absent",
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
                    ss.score_achieved
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
                raw_score = a.get("score_achieved")
                has_score = raw_score is not None
                score_val = float(raw_score) if has_score else 0.0
                tot_marks = int(a["total_marks"]) if a.get("total_marks") is not None else 100
                assessments.append({
                    "id": str(a["id"]),
                    "title": a.get("title") or "Assessment",
                    "type": a.get("type") or "Continuous",
                    "weightage": float(a.get("weightage") or 0),
                    "score": score_val,
                    "totalMarks": tot_marks
                })
                # Only include completed assessments in score count and average
                if has_score and tot_marks > 0:
                    pct = (score_val / float(tot_marks)) * 100
                    score_sum += pct
                    cnt += 1

            # Calculate composite class performance accurately
            has_assessment_data = cnt > 0
            if has_attendance_data and has_assessment_data:
                ca_avg = score_sum / cnt
                performance_numeric = round((att_rate * 0.6) + (ca_avg * 0.4))
            elif has_assessment_data:
                performance_numeric = round(score_sum / cnt)
            elif has_attendance_data:
                performance_numeric = round(att_rate)
            else:
                performance_numeric = 0

            lecturer_info = {
                "full_name": class_row.get("lecturer_name"),
                "email": class_row.get("lecturer_email") or "N/A",
                "phone_number": class_row.get("lecturer_phone") or "N/A",
                "office_location": class_row.get("lecturer_office") or "Lecturer Suite, PASUM",
                "affiliation": class_row.get("lecturer_affiliation") or "Centre for Foundation Studies"
            } if class_row.get("lecturer_name") else None

            return {
                "lecturerInfo": lecturer_info,
                "classScheduleText": schedule_text,
                "attendanceRate": att_rate,
                "performanceNumeric": performance_numeric,
                "attendanceLog": attendance_log,
                "assessments": assessments
            }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Student Class Details Error: {str(e)}")


def get_student_alerts(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")

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

            now_ms = datetime.now(timezone.utc).timestamp() * 1000
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
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Student Alerts Error: {str(e)}")


def mark_all_student_alerts_read(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
            cur.execute("UPDATE public.alerts SET is_read = true WHERE student_id = %s;", (student_id,))
            db.commit()
            return {"status": "success", "message": "All student alerts marked as read."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Mark All Student Read Error: {str(e)}")


def mark_student_alert_read(alert_id: str, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
            cur.execute("UPDATE public.alerts SET is_read = true WHERE id = %s AND student_id = %s RETURNING id;", (alert_id, student_id))
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Alert not found or access denied")
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Mark Alert Read Error: {str(e)}")


def get_student_merit_claims(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Get Merit Claims Error: {str(e)}")


def create_student_merit_claim(req: StudentMeritClaimRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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
            db.commit()
            return {"status": "success", "claim": claim}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Create Merit Claim Error: {str(e)}")


def get_student_settings(user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            
            # Fetch profile for Face ID/Device
            cur.execute("SELECT face_hash, device_id FROM public.profiles WHERE id = %s", (student_id,))
            profile = cur.fetchone() or {}
            
            # Fetch settings
            cur.execute("SELECT language, notifications_enabled FROM public.settings WHERE lecturer_id = %s", (student_id,))
            settings = cur.fetchone() or {"language": "en", "notifications_enabled": True}
            
            return {
                "profile": profile,
                "settings": settings
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_student_settings(settings: dict, user: dict, db):
    try:
        with db.cursor() as cur:
            student_id = user["id"]
            language = settings.get("language", "en")
            notifications_enabled = settings.get("notifications_enabled", True)
            
            cur.execute("""
                INSERT INTO public.settings (lecturer_id, language, notifications_enabled, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (lecturer_id) DO UPDATE SET
                    language = EXCLUDED.language,
                    notifications_enabled = EXCLUDED.notifications_enabled,
                    updated_at = NOW();
            """, (student_id, language, notifications_enabled))
            db.commit()
            return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def send_intervention_email(student_email: str, student_name: str, subject_name: str, issue: str, db = Depends(get_db)):
    # Print clear message to standard output/logs (this represents sending the email)
    print("\n" + "="*80)
    print(f"SMTP SIMULATOR: Sending Email to {student_email}...")
    print(f"Subject: Academic Intervention Initiated - {subject_name}")
    print(f"Dear {student_name},\n")
    print(f"This email is to notify you that an academic intervention case has been created for your class {subject_name}.")
    print(f"Details/Reason: {issue}")
    print("\nPlease log into SmartCare PASUM to view the intervention board or contact your lecturer for support.")
    print("="*80 + "\n")


def create_intervention(req: InterventionCreateRequest, user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
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

            db.commit()

            # Send mock email notification
            send_intervention_email(student["email"], student["full_name"], subject_name, req.issue_description)

            return {"status": "success", "intervention": intervention}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Create Intervention Error: {str(e)}")


def get_student_interventions(user: dict = Depends(get_current_user), db = Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            student_id = user["id"]
            check_user_auth(cur, student_id, "student")
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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Get Interventions Error: {str(e)}")




