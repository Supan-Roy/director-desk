import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.repository import get_db, user_repository
from app.db.models import User
from app.services.auth_service import require_user
from app.services.email_service import send_delete_otp_email
import random

logger = logging.getLogger(__name__)
router = APIRouter(tags=["settings_auth"])


class DeleteRequestPayload(BaseModel):
    reason: str


@router.post("/settings/delete-account/request")
def request_account_deletion(
    payload: DeleteRequestPayload,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Generate deletion OTP, store on user record, and send confirmation email."""
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Save deletion token (as OTP) to database
    user_repository.update(
        db,
        current_user.id,
        delete_token=otp,
        delete_token_expires_at=expires_at
    )

    # Log reason for telemetry/admin audit
    logger.info(f"User {current_user.email} requested account deletion via OTP. Reason: {payload.reason}")

    # Send email
    sent = send_delete_otp_email(current_user.email, otp)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send deletion verification OTP. Please try again."
        )

    return {
        "status": "success",
        "message": "Account deletion verification OTP has been dispatched to your email."
    }


class DeleteConfirmPayload(BaseModel):
    otp_code: str


@router.post("/settings/delete-account/confirm")
def confirm_account_deletion_otp(
    payload: DeleteConfirmPayload,
    response: Response,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Validate delete OTP, purge user data from DB, and clear session cookie."""
    if not current_user.delete_token or current_user.delete_token != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid deletion verification code."
        )

    now = datetime.now(timezone.utc)
    exp = current_user.delete_token_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if not exp or now > exp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion verification code has expired. Please request a new code."
        )

    email = current_user.email

    # Purge user (SQLite cascades deletes to projects via foreign key)
    deleted = user_repository.delete(db, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user profile database record. Please contact support."
        )

    # Clear authentication cookie
    response.delete_cookie(
        key="session_token",
        httponly=True,
        samesite="lax",
        secure=False
    )

    logger.info(f"User account {email} permanently purged via verified OTP code.")

    return {
        "status": "success",
        "message": "Account successfully deleted."
    }


@router.get("/settings/delete-account/confirm", response_class=HTMLResponse)
def confirm_account_deletion(
    token: str,
    response: Response,
    db: Session = Depends(get_db)
):
    """Validate delete token, purge user data from DB, and clear session cookie."""
    user = user_repository.get_by_delete_token(db, token)
    if not user:
        return HTMLResponse(
            status_code=400,
            content=get_status_html("Invalid Token", "The account deletion verification token is invalid or already used.", True)
        )

    now = datetime.now(timezone.utc)
    exp = user.delete_token_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if not exp or now > exp:
        return HTMLResponse(
            status_code=400,
            content=get_status_html("Token Expired", "The account deletion verification link has expired (valid for 1 hour). Please log in and request a new link.", True)
        )

    email = user.email

    # Purge user (SQLite cascades deletes to projects via foreign key)
    deleted = user_repository.delete(db, user.id)
    if not deleted:
        return HTMLResponse(
            status_code=500,
            content=get_status_html("Server Error", "Failed to delete user profile database record. Please contact support.", True)
        )

    # Clear authentication cookie
    response.delete_cookie(
        key="session_token",
        httponly=True,
        samesite="lax",
        secure=False
    )

    logger.info(f"User account {email} permanently purged via verified email link.")

    return HTMLResponse(
        content=get_status_html("Account Permanently Deleted", "Your Director Desk account and all associated projects, custom templates, and assets have been permanently erased from our servers.", False)
    )


def get_status_html(title: str, message: str, is_error: bool) -> str:
    """Return a premium, styled HTML responsive confirmation status screen."""
    accent_color = "#dc2626" if is_error else "#6d28d9"
    icon = "⚠️" if is_error else "✅"
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} — Director Desk</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                background-color: #06060b;
                color: #e2e3e5;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
            }}
            .card {{
                max-width: 440px;
                padding: 40px 30px;
                background-color: #0b0b14;
                border: 1px solid #1f1f2e;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 20px;
            }}
            h1 {{
                font-size: 20px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin: 0 0 15px 0;
                color: {accent_color};
            }}
            p {{
                font-size: 13px;
                line-height: 1.6;
                color: #a1a1aa;
                margin: 0 0 25px 0;
            }}
            .btn {{
                display: inline-block;
                padding: 10px 24px;
                background-color: #1f1f2e;
                border: 1px solid #2e2e44;
                color: #e2e3e5;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                text-decoration: none;
                transition: all 0.2s;
            }}
            .btn:hover {{
                background-color: #2e2e44;
                border-color: #444466;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">{icon}</div>
            <h1>{title}</h1>
            <p>{message}</p>
            <a href="http://localhost:5173" class="btn">Return to Studio</a>
        </div>
    </body>
    </html>
    """
