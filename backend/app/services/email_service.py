import os
import json
import urllib.request
import urllib.error
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Fetch variables from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY") or os.getenv("EMAIL_HOST_PASSWORD") or ""
FROM_EMAIL = os.getenv("FROM_EMAIL") or os.getenv("DEFAULT_FROM_EMAIL") or "onboarding@resend.dev"


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email using resend.com REST API."""
    if not RESEND_API_KEY:
        logger.warning("==================================================")
        logger.warning("RESEND_API_KEY is not configured. Simulating email:")
        logger.warning(f"TO: {to_email}")
        logger.warning(f"SUBJECT: {subject}")
        logger.warning("CONTENT:")
        logger.warning(html_content)
        logger.warning("==================================================")
        return True

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "DirectorDesk/1.0"
    }
    
    # Note: test credentials can only send to the registered owner's email.
    data = {
        "from": f"Director Desk <{FROM_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            logger.info(f"Email sent successfully to {to_email}. Response: {res_body}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        logger.error(f"Failed to send email via Resend. HTTPError: {e.code} - {err_body}")
        
        # Self-healing fallback: If custom from_email failed with 403 (unverified domain), try onboarding@resend.dev
        if e.code == 403 and FROM_EMAIL != "onboarding@resend.dev":
            logger.warning("Attempting self-healing fallback to 'onboarding@resend.dev'...")
            data["from"] = "Director Desk <onboarding@resend.dev>"
            try:
                fallback_req = urllib.request.Request(
                    url,
                    data=json.dumps(data).encode('utf-8'),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(fallback_req) as fallback_response:
                    fallback_res_body = fallback_response.read().decode('utf-8')
                    logger.info(f"Email sent successfully using fallback to {to_email}. Response: {fallback_res_body}")
                    return True
            except Exception as fallback_exc:
                logger.error(f"Fallback email sending failed: {fallback_exc}")
        
        return False
    except Exception as e:
        logger.error(f"Failed to send email via Resend. Exception: {e}")
        return False


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Send OTP verification code to user email."""
    subject = "Director Desk - Your Verification OTP Code"
    html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a; font-family: 'Helvetica Neue', Arial, sans-serif; display: inline-block; vertical-align: middle;">
                DIRECT<span style="color: #6d28d9;">O</span>R <span style="font-weight: 300; letter-spacing: 1px; color: #6d28d9;">DESK</span>
            </span>
            <div style="font-size: 8px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 4px;">CREATIVE STUDIO</div>
        </div>
        <p>Hello,</p>
        <p>Thank you for signing up for Director Desk! Please use the following 6-digit One-Time Password (OTP) to complete your registration or login:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background-color: #f3f4f6; padding: 10px 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
                {otp_code}
            </span>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
    """
    return send_email(to_email, subject, html)


def send_delete_confirmation_email(to_email: str, confirm_url: str) -> bool:
    """Send account deletion confirmation link to user email."""
    subject = "Director Desk - Confirm Account Deletion"
    html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a; font-family: 'Helvetica Neue', Arial, sans-serif; display: inline-block; vertical-align: middle;">
                DIRECT<span style="color: #dc2626;">O</span>R <span style="font-weight: 300; letter-spacing: 1px; color: #dc2626;">DESK</span>
            </span>
            <div style="font-size: 8px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 4px;">CREATIVE STUDIO</div>
        </div>
        <p>Hello,</p>
        <p>We received a request to permanently delete your Director Desk account. Please note that this action is irreversible and will delete all your projects, character assets, scene videos, and account details.</p>
        <p>To confirm and complete this request, please click the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{confirm_url}" style="font-size: 14px; font-weight: bold; color: #ffffff; background-color: #dc2626; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Permanently Delete My Account
            </a>
        </div>
        <p style="word-break: break-all; color: #6b7280; font-size: 11px;">If the button doesn't work, copy and paste this URL into your browser:<br/>{confirm_url}</p>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">This deletion link is valid for 1 hour. If you did not request this, please ignore this email and secure your account.</p>
    </div>
    """
    return send_email(to_email, subject, html)


def send_delete_otp_email(to_email: str, otp: str) -> bool:
    """Send account deletion confirmation OTP code to user email."""
    subject = "Director Desk - Confirm Account Deletion OTP"
    html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
            <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a; font-family: 'Helvetica Neue', Arial, sans-serif; display: inline-block; vertical-align: middle;">
                DIRECT<span style="color: #dc2626;">O</span>R <span style="font-weight: 300; letter-spacing: 1px; color: #dc2626;">DESK</span>
            </span>
            <div style="font-size: 8px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 4px;">CREATIVE STUDIO</div>
        </div>
        <p>Hello,</p>
        <p>We received a request to permanently delete your Director Desk account. Please note that this action is irreversible and will delete all your projects, character assets, scene videos, and account details.</p>
        <p>To confirm and complete this request, use the following 6-digit verification code in the studio console:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #dc2626; background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px 24px; border-radius: 8px; display: inline-block; font-family: monospace;">
                {otp}
            </span>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">This OTP code is valid for 15 minutes. If you did not request this, please ignore this email and secure your account.</p>
    </div>
    """
    return send_email(to_email, subject, html)
