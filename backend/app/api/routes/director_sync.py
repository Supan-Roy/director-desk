"""
director_sync.py

Director Sync™ — REST API routes.

Endpoints under /api/projects/{project_id}/sync:
  GET  /status       — Returns production health per category
  POST /analyze      — Returns impact of changing an asset
  POST /mark-stale   — Called after asset save to flag dirty nodes
  POST /propagate    — Marks stale nodes as synced (clears state)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.production_graph_service import production_graph_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["director_sync"])


# ── Request / Response models ─────────────────────────────────────────────────

class AnalyzeImpactRequest(BaseModel):
    asset_type: str   # "character" | "environment" | "voice" | "storyboard" | "scene"
    asset_name: str


class MarkStaleRequest(BaseModel):
    asset_type: str
    asset_name: str


class PropagateRequest(BaseModel):
    affected_node_ids: Optional[list] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/sync/status")
async def get_sync_status(project_id: int, db: Session = Depends(get_db)):
    """
    Returns the overall Director Sync™ status for a project.
    Includes per-category health (characters, voices, environments, scenes, poster, trailer).
    """
    try:
        status = await production_graph_service.get_sync_status(db, project_id)
        return status
    except Exception as e:
        logger.error(f"Error getting sync status for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compute sync status: {str(e)}")


@router.post("/api/projects/{project_id}/sync/analyze")
async def analyze_impact(
    project_id: int,
    request: AnalyzeImpactRequest,
    db: Session = Depends(get_db)
):
    """
    Analyzes the downstream impact of changing an asset.
    Returns affected nodes and estimated credits + time.
    """
    try:
        result = await production_graph_service.analyze_impact(
            db=db,
            project_id=project_id,
            asset_type=request.asset_type,
            asset_name=request.asset_name,
        )
        return result
    except Exception as e:
        logger.error(f"Error analyzing impact for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze impact: {str(e)}")


@router.post("/api/projects/{project_id}/sync/mark-stale")
async def mark_stale(
    project_id: int,
    request: MarkStaleRequest,
):
    """
    Called after any asset is saved/updated to mark it and its downstream
    as out-of-sync. Triggers a Redis stale key with 5-minute TTL.
    """
    try:
        await production_graph_service.mark_stale(
            project_id=project_id,
            asset_type=request.asset_type,
            asset_name=request.asset_name,
        )
        return {"ok": True, "message": f"{request.asset_name} marked as stale."}
    except Exception as e:
        logger.error(f"Error marking stale for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark stale: {str(e)}")


@router.post("/api/projects/{project_id}/sync/propagate")
async def propagate_sync(
    project_id: int,
    request: PropagateRequest,
    db: Session = Depends(get_db)
):
    """
    Executes Director Sync™ propagation — clears stale markers and returns
    the list of nodes that were re-synced. Actual AI regeneration is
    triggered separately via /api/generate/* endpoints.
    """
    try:
        result = await production_graph_service.propagate(
            db=db,
            project_id=project_id,
            affected_node_ids=request.affected_node_ids,
        )
        return result
    except Exception as e:
        logger.error(f"Error propagating sync for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to propagate: {str(e)}")


@router.get("/api/projects/{project_id}/sync/graph")
async def get_production_graph(project_id: int, db: Session = Depends(get_db)):
    """
    Returns the full computed dependency graph for a project.
    Useful for debugging and advanced UI views.
    """
    try:
        graph = await production_graph_service.build_graph(db, project_id)
        return graph
    except Exception as e:
        logger.error(f"Error building graph for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to build graph: {str(e)}")
