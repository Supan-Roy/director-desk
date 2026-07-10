"""
Release Studio API routes.

Generates promotional and release assets for a completed project:
  - Official Poster (16:9)
  - YouTube Thumbnail (16:9)
  - Vertical Poster (9:16)
  - Social Banner (21:9)
  - Trailer (FFmpeg compilation of approved scenes)
  - Movie Credits (JSON)
  - Release Package (ZIP download)
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.repository import get_db, project_repository
from app.db.models import User
from app.schemas.release_schemas import (
    ReleaseStatusResponse,
    ReleaseAssetStatus,
    GenerateAssetResponse,
    TrailerConfig,
)
from app.services.auth_service import get_current_user
from app.services import release_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/projects",
    tags=["release"],
)


def _get_project_or_404(project_id: int, db: Session):
    """Fetch project or raise 404."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return project


# ── GET release status ───────────────────────────────────────────────────────


@router.get("/{project_id}/release", response_model=ReleaseStatusResponse)
def get_release_status(project_id: int, db: Session = Depends(get_db)):
    """Get the current status of all release assets for a project.
    Auto-detects stale 'generating' entries (>5 min) and resets them.
    """
    project = _get_project_or_404(project_id, db)
    assets = dict(project.release_assets or {})
    now = datetime.now(timezone.utc)
    changed = False
    asset_keys = ["poster", "thumbnail", "poster_vertical", "banner", "trailer", "credits"]

    for key in asset_keys:
        entry = assets.get(key)
        if not entry or not isinstance(entry, dict):
            continue
        if entry.get("status") == "generating":
            # Check if the expected file already exists on disk (server restart / crash recovery)
            filename_map = {
                "poster": "poster.jpg",
                "thumbnail": "thumbnail.jpg",
                "poster_vertical": "poster-vertical.jpg",
                "banner": "banner.jpg",
                "trailer": "trailer.mp4",
                "credits": "credits.json",
            }
            fname = filename_map.get(key)
            file_path = os.path.join("static", "release-assets", str(project_id), fname) if fname else None
            if file_path and os.path.exists(file_path):
                entry["url"] = f"/static/release-assets/{project_id}/{fname}"
                entry["status"] = "completed"
                entry["generated_at"] = now.isoformat()
                entry.pop("started_at", None)
                entry.pop("error", None)
                assets[key] = entry
                changed = True
                continue
            # No file on disk — check if it timed out (>5 min)
            started_at = entry.get("started_at")
            if started_at:
                try:
                    started = datetime.fromisoformat(started_at)
                    if (now - started).total_seconds() > 300:
                        entry["status"] = "failed"
                        entry.pop("started_at", None)
                        entry["error"] = "Generation timed out"
                        assets[key] = entry
                        changed = True
                except (ValueError, TypeError):
                    pass

    if changed:
        project.release_assets = assets
        db.commit()

    def _asset(key: str) -> ReleaseAssetStatus:
        entry = assets.get(key, {})
        if not isinstance(entry, dict):
            entry = {}
        return ReleaseAssetStatus(
            url=entry.get("url"),
            status=entry.get("status", "pending"),
            error=entry.get("error"),
            generated_at=entry.get("generated_at"),
            duration=entry.get("duration"),
        )

    return ReleaseStatusResponse(
        poster=_asset("poster"),
        thumbnail=_asset("thumbnail"),
        poster_vertical=_asset("poster_vertical"),
        banner=_asset("banner"),
        trailer=_asset("trailer"),
        credits=_asset("credits"),
    )


# ── Generate Endpoints ───────────────────────────────────────────────────────


@router.post("/{project_id}/release/generate/poster")
def generate_poster(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate the official movie poster (16:9)."""
    _get_project_or_404(project_id, db)
    background_tasks.add_task(release_service._bg_generate_poster, project_id)
    return GenerateAssetResponse(
        asset_type="poster",
        status="generating",
        message="Poster generation started",
    )


@router.post("/{project_id}/release/generate/thumbnail")
def generate_thumbnail(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate a YouTube thumbnail (16:9)."""
    _get_project_or_404(project_id, db)
    background_tasks.add_task(release_service._bg_generate_thumbnail, project_id)
    return GenerateAssetResponse(
        asset_type="thumbnail",
        status="generating",
        message="Thumbnail generation started",
    )


@router.post("/{project_id}/release/generate/poster-vertical")
def generate_poster_vertical(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate a vertical mobile poster (9:16)."""
    _get_project_or_404(project_id, db)
    background_tasks.add_task(release_service._bg_generate_poster_vertical, project_id)
    return GenerateAssetResponse(
        asset_type="poster_vertical",
        status="generating",
        message="Vertical poster generation started",
    )


@router.post("/{project_id}/release/generate/banner")
def generate_banner(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate a social media banner (21:9)."""
    _get_project_or_404(project_id, db)
    background_tasks.add_task(release_service._bg_generate_banner, project_id)
    return GenerateAssetResponse(
        asset_type="banner",
        status="generating",
        message="Banner generation started",
    )


@router.post("/{project_id}/release/generate/trailer")
def generate_trailer(
    project_id: int,
    background_tasks: BackgroundTasks,
    config: TrailerConfig = TrailerConfig(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate a trailer by analyzing scenes and assembling clips with FFmpeg."""
    _get_project_or_404(project_id, db)
    background_tasks.add_task(
        release_service._bg_generate_trailer, project_id, config.duration
    )
    return GenerateAssetResponse(
        asset_type="trailer",
        status="generating",
        message=f"Trailer generation started ({config.duration}s)",
    )


@router.post("/{project_id}/release/generate/credits")
def generate_credits(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate movie credits from project metadata."""
    _get_project_or_404(project_id, db)
    user_id = current_user.id if current_user else None
    background_tasks.add_task(release_service._bg_generate_credits, project_id, user_id)
    return GenerateAssetResponse(
        asset_type="credits",
        status="generating",
        message="Credits generation started",
    )


@router.post("/{project_id}/release/generate/all")
def generate_all(
    project_id: int,
    background_tasks: BackgroundTasks,
    config: TrailerConfig = TrailerConfig(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Generate all release assets in sequence."""
    _get_project_or_404(project_id, db)
    user_id = current_user.id if current_user else None
    background_tasks.add_task(
        release_service._bg_generate_all, project_id, config.duration, user_id
    )
    return GenerateAssetResponse(
        asset_type="all",
        status="generating",
        message="All assets generation started",
    )


# ── Cancel ───────────────────────────────────────────────────────────────────


@router.post("/{project_id}/release/cancel")
def cancel_release(project_id: int, db: Session = Depends(get_db)):
    """Cancel all running release generation for a project — immediately resets DB status."""
    project = _get_project_or_404(project_id, db)
    release_service.cancel_generation(project_id)
    # Immediately reset any generating/pending statuses in the DB so UI reflects instantly
    asset_keys = ["poster", "thumbnail", "poster_vertical", "banner", "trailer", "credits"]
    assets = dict(project.release_assets or {})
    changed = False
    for key in asset_keys:
        entry = dict(assets.get(key, {}))
        if entry.get("status") in ("generating", "pending"):
            entry["status"] = "cancelled"
            entry.pop("error", None)
            assets[key] = entry
            changed = True
    if changed:
        project.release_assets = assets
        db.commit()
    return {"message": "Release generation cancelled", "project_id": project_id}


# ── Download Package ─────────────────────────────────────────────────────────


@router.get("/{project_id}/release/download")
def download_package(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Download all completed release assets as a ZIP file."""
    project = _get_project_or_404(project_id, db)
    zip_path = os.path.join("static", "release-assets", str(project_id), "release-package.zip")

    # Generate the ZIP (runs synchronously, creates ZIP from existing assets)
    release_service.download_package(project_id, db)

    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="No release assets generated yet")

    safe_title = "".join(c for c in (project.title or "release") if c.isalnum() or c in " -_").strip() or "release"
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"{safe_title}-package.zip",
    )


# ── Individual Asset Download ────────────────────────────────────────────────


@router.get("/{project_id}/release/download/{asset_type}")
def download_asset(
    project_id: int,
    asset_type: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Download an individual release asset as a file (forces download, not browser preview)."""
    project = _get_project_or_404(project_id, db)
    assets = project.release_assets or {}

    filename_map = {
        "poster": ("poster.jpg", "image/jpeg"),
        "thumbnail": ("thumbnail.jpg", "image/jpeg"),
        "poster_vertical": ("poster-vertical.jpg", "image/jpeg"),
        "banner": ("banner.jpg", "image/jpeg"),
        "trailer": ("trailer.mp4", "video/mp4"),
        "credits": ("credits.json", "application/json"),
    }

    if asset_type not in filename_map:
        raise HTTPException(status_code=400, detail=f"Unknown asset type: {asset_type}")

    fname, mime = filename_map[asset_type]
    file_path = os.path.join("static", "release-assets", str(project_id), fname)

    entry = assets.get(asset_type, {})
    # File may exist on disk even if DB status says otherwise (cancel recovery)
    if entry.get("status") != "completed":
        if os.path.exists(file_path):
            # Recover: update DB and serve the file
            entry["url"] = f"/static/release-assets/{project_id}/{fname}"
            entry["status"] = "completed"
            entry.pop("error", None)
            entry.pop("started_at", None)
            assets[asset_type] = entry
            project.release_assets = assets
            db.commit()
        else:
            raise HTTPException(status_code=404, detail=f"Asset '{asset_type}' not yet generated")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Asset file not found on disk")

    safe_title = "".join(c for c in (project.title or "release") if c.isalnum() or c in " -_").strip() or "release"
    download_name = f"{safe_title}-{fname}"

    return FileResponse(
        path=file_path,
        media_type=mime,
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )
