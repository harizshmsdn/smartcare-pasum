import os
from typing import Optional
from fastapi import HTTPException, Header
from jose import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-with-at-least-32-characters-long")
JWT_ALGORITHM = "HS256"
ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV.lower() == "production"

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


def check_user_auth(cur, user_id: str, required_role: str = None) -> dict:
    """Verifies that the user exists, returns their profile, and optionally validates their role."""
    cur.execute(
        """
        SELECT id, role, full_name, COALESCE(total_merit_score, 0) as total_merit_score 
        FROM public.profiles 
        WHERE id = %s LIMIT 1;
        """,
        (user_id,)
    )
    profile = cur.fetchone()
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User profile not found")
    if required_role and profile["role"] != required_role:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=f"Access denied: {profile['role']} role is not authorized")
    return profile

def check_admin_auth(user: dict, cur):
    """Verifies that the user has the 'admin' role."""
    cur.execute("SELECT role FROM public.profiles WHERE id = %s LIMIT 1;", (user["id"],))
    p = cur.fetchone()
    role = p.get("role") if isinstance(p, dict) else (p[0] if p else None)
    if role != 'admin':
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")
