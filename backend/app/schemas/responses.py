from pydantic import BaseModel

class StoryboardScene(BaseModel):
    scene_number: int
    camera_shot: str
    environment: str
    mood: str


class GenerateResponse(BaseModel):
    title: str
    script: str
    storyboard: list[StoryboardScene]