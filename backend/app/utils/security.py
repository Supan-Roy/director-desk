import os
import json
import logging
from fastapi import Request, HTTPException, status
from app.core.redis import redis_manager

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, limit: int, window: int = 60):
        self.limit = limit
        self.window = window

    async def __call__(self, request: Request):
        try:
            client_ip = request.headers.get("x-forwarded-for") or request.client.host
        except Exception:
            client_ip = "unknown"
            
        path = request.url.path
        key = f"rate_limit:{client_ip}:{path}"
        
        try:
            client = await redis_manager.get_client()
            if not client:
                logger.warning("Redis client is not available. Rate limiter bypassed (fail-open).")
                return
                
            current = await client.get(key)
            if current is not None:
                count = int(current)
                if count >= self.limit:
                    logger.warning(f"Rate limit hit: IP={client_ip}, Path={path}, Limit={self.limit}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests. Limit is {self.limit} requests per {self.window} seconds."
                    )
                await client.incr(key)
            else:
                await client.set(key, 1, ex=self.window)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error for IP {client_ip} on path {path}: {e}")
            return

def validate_media_magic_number(body: bytes, filename: str) -> bool:
    """
    Validates that the file headers (magic numbers) match a supported media/text type.
    Returns True if valid, False otherwise.
    """
    ext = os.path.splitext(filename.lower())[1]
    
    # 1. Allowed text file formats (SRT, VTT, JSON, TXT)
    if ext in [".srt", ".vtt", ".json", ".txt"]:
        try:
            head = body[:1000]
            head.decode("utf-8")
            if ext == ".vtt":
                stripped = head.lstrip(b"\xef\xbb\xbf")
                if not stripped.startswith(b"WEBVTT"):
                    return False
            elif ext == ".srt":
                stripped = head.lstrip(b"\xef\xbb\xbf").strip()
                if stripped and not (stripped[0:1].isdigit() or stripped.startswith(b"1")):
                    return False
            elif ext == ".json":
                stripped = head.lstrip(b"\xef\xbb\xbf").strip()
                if stripped and not (stripped.startswith(b"{") or stripped.startswith(b"[")):
                    return False
            return True
        except UnicodeDecodeError:
            return False
            
    # 2. Binary signatures
    # JPEG: FF D8 FF
    if body.startswith(b"\xff\xd8\xff"):
        return ext in [".jpg", ".jpeg"]
        
    # PNG: 89 50 4E 47
    if body.startswith(b"\x89PNG\r\n\x1a\n"):
        return ext == ".png"
        
    # GIF: GIF8
    if body.startswith(b"GIF8"):
        return ext == ".gif"
        
    # EBML (MKV, WebM): 1A 45 DF A3
    if body.startswith(b"\x1a\x45\xdf\xa3"):
        return ext in [".mkv", ".webm"]
        
    # OGG: OggS
    if body.startswith(b"OggS"):
        return ext in [".ogg", ".ogv", ".oga"]
        
    # RIFF (WAV, AVI, WEBP)
    if body.startswith(b"RIFF"):
        if len(body) >= 12:
            riff_type = body[8:12]
            if riff_type == b"WAVE":
                return ext == ".wav"
            elif riff_type == b"AVI ":
                return ext == ".avi"
            elif riff_type == b"WEBP":
                return ext == ".webp"
        return False
        
    # MP3 (ID3 or sync frame)
    if body.startswith(b"ID3") or (len(body) >= 2 and body[0] == 0xff and (body[1] & 0xe0) == 0xe0):
        return ext == ".mp3"
        
    # MP4 & MOV (check for ftyp box)
    if len(body) >= 12 and b"ftyp" in body[4:12]:
        return ext in [".mp4", ".mov", ".m4a"]
        
    # PDF: %PDF
    if body.startswith(b"%PDF"):
        return ext == ".pdf"
        
    # Fail closed for safety
    return False
