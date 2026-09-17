import time
import threading
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, Depends

# Thread-safe storage for sliding window timestamps
_rate_limit_store: Dict[str, List[float]] = {}
_quota_store: Dict[str, List[float]] = {}
_store_lock = threading.Lock()

class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""
    
    @staticmethod
    def is_allowed(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        now = time.time()
        cutoff = now - window_seconds
        
        with _store_lock:
            timestamps = _rate_limit_store.get(key, [])
            # Prune timestamps outside the active window
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            
            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now))
                _rate_limit_store[key] = valid_timestamps
                return False, 0, retry_after
            
            # Record current request timestamp
            valid_timestamps.append(now)
            _rate_limit_store[key] = valid_timestamps
            remaining = max_requests - len(valid_timestamps)
            return True, remaining, 0

    @staticmethod
    def check_quota(key: str, max_operations: int, window_seconds: int = 86400) -> tuple[bool, int, int]:
        now = time.time()
        cutoff = now - window_seconds
        
        with _store_lock:
            timestamps = _quota_store.get(key, [])
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            
            if len(valid_timestamps) >= max_operations:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now))
                _quota_store[key] = valid_timestamps
                return False, 0, retry_after
            
            valid_timestamps.append(now)
            _quota_store[key] = valid_timestamps
            remaining = max_operations - len(valid_timestamps)
            return True, remaining, 0

def get_client_identifier(request: Request) -> str:
    """Extracts client IP or forward-header address."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def rate_limit(max_requests: int, window_seconds: int = 60, by_user: bool = False):
    """FastAPI dependency factory enforcing rate limits."""
    def dependency(request: Request):
        if by_user and hasattr(request.state, "user_id"):
            identifier = f"user:{request.state.user_id}:{request.url.path}"
        else:
            client_ip = get_client_identifier(request)
            identifier = f"ip:{client_ip}:{request.url.path}"
        
        allowed, remaining, retry_after = SlidingWindowRateLimiter.is_allowed(
            identifier, max_requests, window_seconds
        )
        
        # Attach response rate limit metrics
        request.state.rate_limit_limit = str(max_requests)
        request.state.rate_limit_remaining = str(remaining)
        request.state.rate_limit_reset = str(retry_after)
        
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                }
            )
    return dependency

def enforce_daily_quota(user_id: str, action: str, max_daily: int):
    """Enforces daily usage quota on sensitive mutations."""
    quota_key = f"quota:{user_id}:{action}"
    allowed, remaining, retry_after = SlidingWindowRateLimiter.check_quota(quota_key, max_daily, 86400)
    if not allowed:
        hours_left = round(retry_after / 3600, 1)
        raise HTTPException(
            status_code=429,
            detail=f"Daily quota of {max_daily} for '{action}' reached. Resets in {hours_left} hours.",
            headers={"Retry-After": str(retry_after)}
        )
