from fastapi import APIRouter

from app.services.project_state import project_state

router = APIRouter(tags=['script'])


@router.get("/script")
def get_script():
    """Return the current working script content from in-memory state."""
    return {"script": project_state.script or ""}


@router.put("/script")
def update_script(payload: dict):
    """Update the current working script in in-memory state."""
    project_state.script = payload.get("script", "")
    return {"script": project_state.script}

