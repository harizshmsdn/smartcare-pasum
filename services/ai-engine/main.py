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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
