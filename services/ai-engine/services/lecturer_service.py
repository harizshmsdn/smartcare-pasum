from fastapi import HTTPException, Depends
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
from pydantic import BaseModel

def get_lecturer_dashboard(user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]

            # 1. Dashboard summary stats
            cur.execute("""
                SELECT COUNT(*) as total_classes 
                FROM public.classes 
                WHERE lecturer_id = %s;
            """, (user_id,))
            total_classes = cur.fetchone()["total_classes"]

            cur.execute("""
                SELECT COUNT(DISTINCT e.student_id) as total_students 
                FROM public.enrollments e
                JOIN public.classes c ON e.class_id = c.id
                WHERE c.lecturer_id = %s;
            """, (user_id,))
            total_students = cur.fetchone()["total_students"]

            # Interventions assigned to this lecturer or their classes
            cur.execute("""
                SELECT COUNT(*) as pending_interventions
                FROM public.interventions i
                JOIN public.classes c ON i.class_id = c.id
                WHERE c.lecturer_id = %s AND i.status != 'Resolved';
            """, (user_id,))
            pending_interventions = cur.fetchone()["pending_interventions"]

            return {
                "total_classes": total_classes,
                "total_students": total_students,
                "pending_interventions": pending_interventions,
                "average_attendance": 100 # Mock average for now
            }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_lecturer_classes(user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]

            cur.execute("""
                SELECT 
                    c.id, 
                    c.group_code, 
                    c.type,
                    c.semester,
                    c.day_of_week, 
                    c.start_time,
                    c.end_time,
                    c.location,
                    s.code as subject_code,
                    s.name as subject_name
                FROM public.classes c
                LEFT JOIN public.subjects s ON c.subject_id = s.id
                WHERE c.lecturer_id = %s;
            """, (user_id,))
            
            classes = cur.fetchall() or []
            
            formatted_classes = []
            for c in classes:
                class_id = str(c["id"])
                
                # Fetch enrollments for stats
                cur.execute("""
                    SELECT current_attendance_rate 
                    FROM public.enrollments 
                    WHERE class_id = %s;
                """, (class_id,))
                enrollments = cur.fetchall() or []
                
                total_enrollments = len(enrollments)
                avg_attendance = 100
                critical_count = 0
                at_risk_count = 0
                
                if total_enrollments > 0:
                    sum_att = 0
                    for e in enrollments:
                        rate = float(e["current_attendance_rate"]) if e["current_attendance_rate"] is not None else 100.0
                        sum_att += rate
                        if rate < 80:
                            critical_count += 1
                        elif rate < 90:
                            at_risk_count += 1
                    avg_attendance = round(sum_att / total_enrollments)
                    
                # Fetch active session
                cur.execute("""
                    SELECT id, session_pin, online_mode, face_id_required, location_required 
                    FROM public.attendance_sessions 
                    WHERE class_id = %s AND closed_at IS NULL LIMIT 1;
                """, (class_id,))
                active_session = cur.fetchone()
                
                formatted_classes.append({
                    "id": class_id,
                    "group_code": c["group_code"],
                    "type": c["type"],
                    "semester": c["semester"],
                    "day_of_week": c["day_of_week"],
                    "start_time": c["start_time"].strftime("%H:%M:%S") if c["start_time"] else None,
                    "end_time": c["end_time"].strftime("%H:%M:%S") if c["end_time"] else None,
                    "location": c["location"],
                    "subjects": {
                        "code": c["subject_code"],
                        "name": c["subject_name"]
                    },
                    "stats": {
                        "average_attendance": avg_attendance,
                        "critical_count": critical_count,
                        "at_risk_count": at_risk_count,
                        "total_enrollments": total_enrollments
                    },
                    "active_session": {
                        "id": str(active_session["id"]),
                        "session_pin": active_session["session_pin"],
                        "online_mode": active_session["online_mode"],
                        "face_id_required": active_session["face_id_required"],
                        "location_required": active_session["location_required"]
                    } if active_session else None
                })
                
            return {"classes": formatted_classes}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def get_class_roster(class_id: str, user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            
            # Verify ownership
            cur.execute("SELECT id FROM public.classes WHERE id = %s AND lecturer_id = %s LIMIT 1;", (class_id, user_id))
            if cur.fetchone() is None:
                raise HTTPException(status_code=403, detail="Access denied")

            cur.execute("""
                SELECT 
                    e.current_attendance_rate,
                    p.id,
                    p.full_name,
                    p.institutional_id,
                    p.email
                FROM public.enrollments e
                JOIN public.profiles p ON e.student_id = p.id
                WHERE e.class_id = %s;
            """, (class_id,))
            
            enrollments = cur.fetchall() or []
            
            formatted_enrollments = []
            for e in enrollments:
                formatted_enrollments.append({
                    "current_attendance_rate": float(e["current_attendance_rate"]) if e["current_attendance_rate"] is not None else 0.0,
                    "profiles": {
                        "id": str(e["id"]),
                        "full_name": e["full_name"],
                        "institutional_id": e["institutional_id"],
                        "email": e["email"]
                    }
                })

            return {"enrollments": formatted_enrollments}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_lecturer_interventions(user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]

            cur.execute("""
                SELECT 
                    i.id,
                    i.student_id,
                    i.class_id,
                    i.issue_description,
                    i.status,
                    i.priority,
                    i.created_at,
                    p.full_name as student_name,
                    p.institutional_id as matric_id,
                    s.code as subject_code
                FROM public.interventions i
                JOIN public.classes c ON i.class_id = c.id
                JOIN public.profiles p ON i.student_id = p.id
                LEFT JOIN public.subjects s ON c.subject_id = s.id
                WHERE c.lecturer_id = %s
                ORDER BY i.created_at DESC;
            """, (user_id,))
            
            interventions = cur.fetchall() or []
            formatted = []
            for i in interventions:
                formatted.append({
                    "id": str(i["id"]),
                    "student_id": str(i["student_id"]),
                    "class_id": str(i["class_id"]),
                    "issue_description": i["issue_description"],
                    "status": i["status"],
                    "priority": i["priority"],
                    "created_at": i["created_at"].isoformat() if i["created_at"] else None,
                    "student": {
                        "name": i["student_name"],
                        "matric_id": i["matric_id"]
                    },
                    "subject": {
                        "code": i["subject_code"]
                    }
                })
                
            return {"interventions": formatted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class InterventionUpdate(BaseModel):
    status: str

def update_intervention(intervention_id: str, req: dict, user: dict, db):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            user_id = user["id"]
            
            # Verify the intervention belongs to a class taught by the lecturer
            cur.execute("""
                SELECT i.id 
                FROM public.interventions i
                JOIN public.classes c ON i.class_id = c.id
                WHERE i.id = %s AND c.lecturer_id = %s;
            """, (intervention_id, user_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized to update this intervention")
                
            cur.execute("""
                UPDATE public.interventions
                SET status = %s, updated_at = %s
                WHERE id = %s
                RETURNING id, status;
            """, (req.get("status"), datetime.utcnow().isoformat(), intervention_id))
            
            updated = cur.fetchone()
            db.commit()
            
            return updated
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
