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

@app.get("/")
def health_check():
    """Health check endpoint for Render deployment verification."""
    return {"status": "healthy", "service": "tigha AI Engine"}

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
ENV = os.getenv("ENV", "production")
IS_PRODUCTION = ENV.lower() == "production"

def get_db_connection():
    """Establishes connection to the Supabase local PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
