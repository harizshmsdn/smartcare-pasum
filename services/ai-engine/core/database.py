import os
import psycopg2
from psycopg2 import pool
from fastapi import HTTPException

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")

# Threaded connection pool for efficient database resource management
_db_pool = None

def get_pool():
    global _db_pool
    if _db_pool is None:
        try:
            # Initialize connection pool with safe connection bounds
            _db_pool = pool.ThreadedConnectionPool(minconn=1, maxconn=20, dsn=DATABASE_URL)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Database pool initialization error.")
    return _db_pool

def get_db_connection():
    """Retrieves a database connection from the pool."""
    try:
        p = get_pool()
        return p.getconn()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database connection error.")

def release_db_connection(conn):
    """Returns database connection back to pool."""
    if _db_pool and conn:
        try:
            _db_pool.putconn(conn)
        except Exception:
            pass

def get_db():
    """FastAPI Dependency yielding a managed database connection."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        release_db_connection(conn)
