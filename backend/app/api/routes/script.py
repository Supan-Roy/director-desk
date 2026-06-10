from fastapi import APIRouter

from app.services.project_state import project_state

router = APIRouter(tags=['script'])


@router.get("/script")
def get_script():
    return {"script": project_state.script or ""}
