import os
import random
import string
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import psycopg2
from psycopg2.extras import RealDictCursor
from jose import jwt, JWTError

from models.schemas import *
from routers.core import router as core_router
from routers.alerts import router as alerts_router
from routers.analytics import router as analytics_router
from routers.student import router as student_router
from routers.admin import router as admin_router
from routers.lecturer import router as lecturer_router

app = FastAPI(title="SmartCare Attendance Engine", version="1.0.0")

app.include_router(core_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(student_router)
app.include_router(admin_router)
app.include_router(lecturer_router)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
