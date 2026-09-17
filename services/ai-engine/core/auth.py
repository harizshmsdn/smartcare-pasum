import os
import json
import urllib.request
import logging
from typing import Optional
from fastapi import HTTPException, Header
from jose import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-with-at-least-32-characters-long")
JWT_ALGORITHM = "HS256"
ENV = os.getenv("ENV", "production")
IS_PRODUCTION = ENV.lower() == "production"
ALLOW_INSECURE_DEV_AUTH = os.getenv("ALLOW_INSECURE_DEV_AUTH", "false").lower() == "true"

# Security check for default secret key
if IS_PRODUCTION and "super-secret-jwt-key" in JWT_SECRET:
    logging.critical("SECURITY ALERT: Default insecure JWT_SECRET is active in production environment.")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fqiwqsawxsuqheuhegtv.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
JWKS = None
try:
    with urllib.request.urlopen(JWKS_URL) as response:
        JWKS = json.loads(response.read())
except Exception as e:
    logging.warning("Failed to retrieve public JWKS from Supabase.")

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Decodes JWT and authenticates user role/ID securely."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format.")
    
    token = parts[1]
    try:
        # Extract JWT algorithm from header
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", JWT_ALGORITHM)
        
        # Verify and decode Supabase JWT signature
        key = JWKS if JWKS and alg != "HS256" else JWT_SECRET
        payload = jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
        user_id = payload.get("sub")
        role = payload.get("role", "authenticated")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
        return {"id": user_id, "role": role}
    except Exception:
        # Strictly gate unverified fallback behind explicit dev flag
        if not IS_PRODUCTION and ALLOW_INSECURE_DEV_AUTH:
            try:
                payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
                user_id = payload.get("sub")
                role = payload.get("role", "authenticated")
                if user_id:
                    logging.warning("Using unverified JWT token payload for local testing.")
                    return {"id": user_id, "role": role}
            except Exception:
                pass
        raise HTTPException(status_code=401, detail="Could not validate credentials.")

def check_user_auth(cur, user_id: str, required_role: Optional[str] = None) -> dict:
    # Verifies user profile exists and optionally validates role
    cur.execute(
        """
        SELECT *
        FROM public.profiles 
        WHERE id = %s LIMIT 1;
        """,
        (user_id,)
    )
    profile = cur.fetchone()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    if required_role and profile["role"] != required_role:
        raise HTTPException(status_code=403, detail="Access denied: Unauthorized role.")
    return profile

def check_admin_auth(user: dict, cur):
    """Verifies that the user has the 'admin' role."""
    cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user["id"],))
    p = cur.fetchone()
    role = p.get("role") if isinstance(p, dict) else (p[0] if p else None)
    if role != 'admin':
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")
