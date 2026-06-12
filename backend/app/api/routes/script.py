from fastapi import APIRouter

from app.services.project_state import project_state

router = APIRouter(tags=['script'])


@router.get("/script")
def get_script():
    return {"script": project_state.script or ""}


@router.put("/script")
def update_script(payload: dict):
    project_state.script = payload.get("script", "")
    return {"script": project_state.script}

