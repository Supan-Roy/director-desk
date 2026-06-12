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
    storyboard: Optional[List[Dict[str, Any]]] = None
    production_plan: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    """Payload to update fields of a saved project."""
    script: Optional[str] = None

