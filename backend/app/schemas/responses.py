from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class StoryboardScene(BaseModel):
    scene_number: int
    camera_shot: str
    environment: str
    mood: str


class GenerateResponse(BaseModel):
    title: str
    script: str
    storyboard: List[StoryboardScene]
    production_plan: Optional[Dict[str, Any]] = None
    critic_notes: Optional[List[str]] = None