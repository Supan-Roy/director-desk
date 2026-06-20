"""
Project-related Pydantic schemas for API request/response serialisation.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ProjectSummary(BaseModel):
    """Lightweight record returned by GET /projects (sidebar list)."""
    id: int
    title: str
    production_type: Optional[str] = None
    approved: bool = False
    is_pinned: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetail(BaseModel):
    """Full project record returned by GET /projects/{id}."""
    id: int
    title: str
    production_type: Optional[str] = None
    prompt: Optional[str] = None
    script: Optional[str] = None
    original_script: Optional[str] = None
    critic_review: Optional[Dict[str, Any]] = None
    approved: bool = False
    is_pinned: bool = False
    is_archived: bool = False
    storyboard: Optional[List[Dict[str, Any]]] = None
    production_plan: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    """Payload to update fields of a saved project."""
    script: Optional[str] = None
    original_script: Optional[str] = None
    critic_review: Optional[Dict[str, Any]] = None
    approved: Optional[bool] = None
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None

