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
        self.id: Optional[int] = None
        self.has_project = False
        self.title: Optional[str] = None
        self.prompt: Optional[str] = None
        self.script: Optional[str] = None
        self.original_script: Optional[str] = None
        self.storyboard: list[StoryboardScene] = []
        self.production_plan: Optional[dict] = None
        self.critic_notes: list[str] = []
        self.critic_review: Optional[dict] = None
        self.scene_breakdown: Optional[dict] = None
        self.approved: bool = False
        self.production_type: Optional[str] = "Auto Detect"
        self.agents = [
            AgentStatus("writer", "Writer Agent", "Script & Narrative", "✍️"),
            AgentStatus("storyboard", "Storyboard Agent", "Visual Planning", "🎨"),
            AgentStatus("planner", "Production Planner", "Execution Strategy", "📋"),
            AgentStatus("critic", "Critic Agent", "Quality Review", "🔍"),
            AgentStatus("scene_breakdown", "Scene Breakdown Agent", "AI Video Specs & Prompts", "🎬"),
        ]

    def reset(self):
        self.id = None
        self.has_project = False
        self.title = None
        self.prompt = None
        self.script = None
        self.original_script = None
        self.storyboard = []
        self.production_plan = None
        self.critic_notes = []
        self.critic_review = None
        self.scene_breakdown = None
        self.approved = False
        self.production_type = "Auto Detect"
        for agent in self.agents:
            agent.status = "waiting"
            agent.completed_at = None

    def set_agent_status(self, agent_id: str, status: str, completed_at: Optional[str] = None):
        for agent in self.agents:
            if agent.id == agent_id:
                agent.status = status
                if completed_at:
                    agent.completed_at = completed_at

    def set_generation_complete(
        self,
        title: str,
        script: str,
        storyboard: list[StoryboardScene],
        production_plan: Optional[dict] = None,
        critic_review: Optional[dict] = None,
        scene_breakdown: Optional[dict] = None,
        production_type: Optional[str] = "Auto Detect"
    ):
        self.has_project = True
        self.title = title
        self.script = script
        self.original_script = script
        self.storyboard = storyboard
        self.production_plan = production_plan
        self.critic_review = critic_review
        self.critic_notes = critic_review.get("suggestions", []) if critic_review else []
        self.scene_breakdown = scene_breakdown
        self.approved = False
        self.production_type = production_type
        for agent in self.agents:
            agent.status = "completed"
            agent.completed_at = "just now"

    def get_production_plan(self):
        if not self.has_project:
            return None
        
        if self.production_plan:
            return self.production_plan

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
