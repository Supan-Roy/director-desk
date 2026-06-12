from pydantic import BaseModel
from typing import Optional, List

class FilePayload(BaseModel):
    name: str
    type: str
    content: str  # text for text/md, base64 for pdf/images

class GenerateRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "fast"
    production_type: Optional[str] = "Auto Detect"
    files: Optional[List[FilePayload]] = []