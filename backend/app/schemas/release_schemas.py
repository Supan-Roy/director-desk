"""
Release Studio — Pydantic schemas for API request/response serialisation.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ReleaseAssetStatus(BaseModel):
    """Status of a single release asset."""
    url: Optional[str] = None
    status: str = "pending"  # pending | generating | completed | failed | cancelled
    error: Optional[str] = None
    generated_at: Optional[datetime] = None
    duration: Optional[int] = None  # only for trailer


class ReleaseStatusResponse(BaseModel):
    """Full release status for a project."""
    poster: ReleaseAssetStatus = ReleaseAssetStatus()
    thumbnail: ReleaseAssetStatus = ReleaseAssetStatus()
    poster_vertical: ReleaseAssetStatus = ReleaseAssetStatus()
    banner: ReleaseAssetStatus = ReleaseAssetStatus()
    trailer: ReleaseAssetStatus = ReleaseAssetStatus()
    credits: ReleaseAssetStatus = ReleaseAssetStatus()


class GenerateAssetResponse(BaseModel):
    """Response after triggering asset generation."""
    asset_type: str
    status: str = "generating"
    message: str = "Generation started"


class TrailerConfig(BaseModel):
    """Configuration for trailer generation."""
    duration: int = 30  # 15, 30, or 60 seconds
