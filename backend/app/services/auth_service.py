import os
import hmac
import base64
import json
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.db.repository import get_db, user_repository
from app.db.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "cinematic_studio_super_secret_key_1337")


# ---------------------------------------------------------------------------
# Password Hashing & Verification
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA-256 and a random salt."""
    salt = os.urandom(16)
    rounds = 100000
    db_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, rounds)
    # Format: rounds$salt_hex$hash_hex
    return f"{rounds}${salt.hex()}${db_hash.hex()}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a PBKDF2 hashed password."""
    try:
        parts = hashed_password.split('$')
        if len(parts) != 3:
            return False
        rounds = int(parts[0])
        salt = bytes.fromhex(parts[1])
        db_hash = bytes.fromhex(parts[2])
        
        test_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, rounds)
        return hmac.compare_digest(test_hash, db_hash)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Signed HMAC JWT-like Session Tokens
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed HMAC JSON token that expires."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7) # Default 7 days
    to_encode.update({"exp": int(expire.timestamp())})
    
    # Base64 urlsafe encode JSON payload
    payload_json = json.dumps(to_encode).encode('utf-8')
    payload_str = base64.urlsafe_b64encode(payload_json).decode('utf-8')
    
    # Sign payload using HMAC-SHA256
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_str = base64.urlsafe_b64encode(signature).decode('utf-8')
    
    return f"{payload_str}.{signature_str}"


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a signed HMAC JSON token."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_str, signature_str = parts[0], parts[1]
        
        # Verify HMAC signature
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_sig_str = base64.urlsafe_b64encode(expected_sig).decode('utf-8')
        
        if not hmac.compare_digest(signature_str, expected_sig_str):
            return None
            
        # Decode base64 payload
        payload_json = base64.urlsafe_b64decode(payload_str).decode('utf-8')
        payload_data = json.loads(payload_json)
        
        # Verify expiration
        exp = payload_data.get("exp")
        if exp is None or datetime.now(timezone.utc).timestamp() > exp:
            return None
            
        return payload_data
    except Exception:
        return None


# ---------------------------------------------------------------------------
# FastAPI Auth Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Retrieve current logged in user from cookie session or bearer auth header."""
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None
        
    payload = decode_access_token(token)
    if not payload:
        return None
        
    user_id = payload.get("user_id")
    if not user_id:
        return None
        
    return user_repository.get_by_id(db, user_id)


async def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    """Enforce authentication, raising HTTP 401 if anonymous."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in first."
        )
    return user
