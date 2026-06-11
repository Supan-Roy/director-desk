from app.services.showrunner_orchestrator import showrunner_orchestrator
from app.services.project_state import project_state
from app.schemas.responses import GenerateResponse


class ShowrunnerService:

    def generate(self, prompt: str, mode: str = "fast") -> GenerateResponse:
        
        result = showrunner_orchestrator.run_production(prompt, mode)

        project_state.set_generation_complete(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_notes=result["critic_notes"]
        )

        return GenerateResponse(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_notes=result["critic_notes"]
        )


showrunner_service = ShowrunnerService()