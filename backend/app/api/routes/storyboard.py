from fastapi import APIRouter

from app.services.project_state import project_state
from app.schemas.responses import StoryboardScene

router = APIRouter(tags=['storyboard'])


@router.get("/storyboard")
def get_storyboard():
    scenes = [
        {
            "scene": s.scene_number,
            "shot": s.camera_shot,
            "environment": s.environment,
            "mood": s.mood,
            "description": f"{s.camera_shot} in {s.environment} — {s.mood}",
        }
        for s in project_state.storyboard
    ]
    return {"storyboard": scenes}
