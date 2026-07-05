import random
import urllib.request
import urllib.parse
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.repository import get_db, user_repository
from app.db.models import User
from app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from app.services.email_service import send_otp_email

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class EmailCheckRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1)
    last_name: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=32)
    confirm_password: str = Field(..., min_length=6, max_length=32)


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str


class GoogleLoginRequest(BaseModel):
    credential: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/auth/check-email")
def check_email(payload: EmailCheckRequest, db: Session = Depends(get_db)):
    """Check if an email is already registered."""
    user = user_repository.get_by_email(db, payload.email)
    return {"exists": user is not None}


@router.post("/auth/login-email")
def login_email(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Log in using email and password, setting session cookie."""
    user = user_repository.get_by_email(db, payload.email)
    if not user or user.is_google or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Issue session cookie
    token = create_access_token({"user_id": user.id, "email": user.email})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=604800, # 7 days
        samesite="lax",
        secure=False, # Set to True in production
    )

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "last_name": user.last_name,
            "email": user.email
        }
    }


@router.post("/auth/register-email")
def register_email(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Create unverified user and send OTP code."""
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    existing_user = user_repository.get_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    # Generate 6-digit OTP code
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Hash password
    h_password = hash_password(payload.password)

    # Create unverified user in DB
    user_repository.create(
        db,
        name=payload.name,
        last_name=payload.last_name,
        email=payload.email,
        hashed_password=h_password,
        is_google=False
    )

    # Store OTP code on user
    user = user_repository.get_by_email(db, payload.email)
    user_repository.update(
        db,
        user.id,
        otp_code=otp,
        otp_expires_at=expires_at
    )

    # Send OTP email
    sent = send_otp_email(user.email, otp)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again."
        )

    return {"status": "success", "message": "Verification OTP sent to your email."}


@router.post("/auth/verify-otp")
def verify_otp(payload: OTPVerifyRequest, response: Response, db: Session = Depends(get_db)):
    """Verify 6-digit OTP code and authenticate user session."""
    user = user_repository.get_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if not user.otp_code or user.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code."
        )

    now = datetime.now(timezone.utc)
    # Ensure otp expires_at is aware or compare timestamps
    exp = user.otp_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if not exp or now > exp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please request a new one."
        )

    # Clear OTP
    user_repository.update(db, user.id, otp_code=None, otp_expires_at=None)

    # Issue session cookie
    token = create_access_token({"user_id": user.id, "email": user.email})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=604800, # 7 days
        samesite="lax",
        secure=False,
    )

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "last_name": user.last_name,
            "email": user.email
        }
    }


@router.post("/auth/google")
def google_login(payload: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Verify Google token, create user if not exists, and set session cookie."""
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"

    try:
        req = urllib.request.Request(tokeninfo_url, method="GET")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as exc:
        logger.error(f"Google login token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed. Invalid credential token."
        )

    email = data.get("email")
    name = data.get("given_name") or data.get("name") or "Google User"
    last_name = data.get("family_name")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account must share email address."
        )

    user = user_repository.get_by_email(db, email)
    if not user:
        # Create Google user
        user = user_repository.create(
            db,
            name=name,
            last_name=last_name,
            email=email,
            hashed_password=None,
            is_google=True
        )
    elif not user.is_google:
        # Convert existing user to Google login OR link it
        user_repository.update(db, user.id, is_google=True)

    # Issue session cookie
    token = create_access_token({"user_id": user.id, "email": user.email})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=604800,
        samesite="lax",
        secure=False,
    )

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "last_name": user.last_name,
            "email": user.email
        }
    }


@router.post("/auth/logout")
def logout(response: Response):
    """Clear session token cookie."""
    response.delete_cookie(
        key="session_token",
        httponly=True,
        samesite="lax",
        secure=False
    )
    return {"status": "success", "message": "Logged out successfully."}


@router.get("/auth/me")
def get_me(current_user: Optional[User] = Depends(get_current_user)):
    """Return current logged in user details or null."""
    if not current_user:
        return None
    return {
        "id": current_user.id,
        "name": current_user.name,
        "last_name": current_user.last_name,
        "email": current_user.email
    }
