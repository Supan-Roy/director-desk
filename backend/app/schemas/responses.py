from pydantic import BaseModel

class GenerateResponse(BaseModel):
    title: str
    script: str
    storyboard: str