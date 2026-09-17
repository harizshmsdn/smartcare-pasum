import os
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from core.rate_limiter import SlidingWindowRateLimiter, get_client_identifier
from routers.core import router as core_router
from routers.alerts import router as alerts_router
from routers.analytics import router as analytics_router
from routers.student import router as student_router
from routers.admin import router as admin_router
from routers.lecturer import router as lecturer_router

app = FastAPI(title="SmartCare Attendance Engine", version="1.0.0")

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
        return response

# Request body size limiter middleware (1MB limit)
class RequestSizeLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1048576:
            return Response(
                content='{"detail":"Request payload exceeds 1MB limit."}',
                status_code=413,
                media_type="application/json"
            )
        return await call_next(request)

# Global IP rate limiting middleware (120 req/min)
class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Bypass rate limiting for health check
        if request.url.path == "/":
            return await call_next(request)
            
        client_ip = get_client_identifier(request)
        key = f"global:{client_ip}"
        allowed, remaining, retry_after = SlidingWindowRateLimiter.is_allowed(key, 120, 60)
        
        if not allowed:
            return Response(
                content='{"detail":"Global rate limit exceeded. Please slow down."}',
                status_code=429,
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": "120",
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
                media_type="application/json"
            )
            
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = "120"
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimiterMiddleware)
app.add_middleware(GlobalRateLimitMiddleware)

# Allowed CORS origins whitelist
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
