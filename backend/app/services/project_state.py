from typing import Optional
from app.schemas.responses import StoryboardScene


class AgentStatus:
    def __init__(self, agent_id: str, name: str, role: str, icon: str):
        self.id = agent_id
        self.name = name
        self.role = role
        self.icon = icon
        self.status = "waiting"  # waiting, active, completed
        self.completed_at: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "icon": self.icon,
            "status": self.status,
            "completedAt": self.completed_at,
        }


class ProjectState:
    def __init__(self):
        self.has_project = False
        self.title: Optional[str] = None
        self.prompt: Optional[str] = None
        self.script: Optional[str] = None
        self.storyboard: list[StoryboardScene] = []
        self.agents = [
            AgentStatus("writer", "Writer Agent", "Script & Narrative", "✍️"),
            AgentStatus("storyboard", "Storyboard Agent", "Visual Planning", "🎨"),
            AgentStatus("critic", "Critic Agent", "Quality Review", "🔍"),
            AgentStatus("editor", "Editor Agent", "Final Assembly", "🎬"),
        ]

    def reset(self):
        self.has_project = False
        self.title = None
        self.prompt = None
        self.script = None
        self.storyboard = []
        for agent in self.agents:
            agent.status = "waiting"
            agent.completed_at = None

    def set_generation_complete(self, title: str, script: str, storyboard: list[StoryboardScene]):
        self.has_project = True
        self.title = title
        self.script = script
        self.storyboard = storyboard
        self.agents[0].status = "completed"
        self.agents[0].completed_at = "just now"
        self.agents[1].status = "completed"
        self.agents[1].completed_at = "just now"

    def get_production_plan(self):
        if not self.has_project:
            return None
        
        return {
            "title": f"{self.title} — Production Plan" if self.title else "Production Plan",
            "phases": [
                {
                    "name": "Pre-Production",
                    "status": "complete" if self.script else "pending",
                    "items": [
                        "Script finalized by Writer Agent",
                        f"Storyboard completed ({len(self.storyboard)} scenes)" if self.storyboard else "Storyboard in progress",
                        "Character profiles generated",
                        "Environment references compiled",
                    ],
                },
                {
                    "name": "Production",
                    "status": "pending",
                    "items": [
                        "Scene-by-scene image generation",
                        "Camera movement simulation",
                        "Lighting and mood refinement",
                        "Audio landscape design",
                    ],
                },
                {
                    "name": "Post-Production",
                    "status": "pending",
                    "items": [
                        "Scene assembly and transitions",
                        "Voice-over and narration",
                        "Sound design and score",
                        "Final color grading",
                        "Quality review by Critic Agent",
                    ],
                },
            ],
        }


project_state = ProjectState()
