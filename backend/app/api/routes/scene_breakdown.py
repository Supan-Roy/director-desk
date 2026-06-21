from fastapi import APIRouter
from app.services.project_state import project_state

router = APIRouter(tags=['scene_breakdown'])


@router.get("/scene_breakdown")
def get_scene_breakdown():
    breakdown = project_state.scene_breakdown
    if breakdown is None:
        return {"hasProject": False, "scene_breakdown": None}
    return {"hasProject": True, "scene_breakdown": breakdown}
