from pydantic import BaseModel

class GenerateResponse(BaseModel):
    title: str
    script: list[str]