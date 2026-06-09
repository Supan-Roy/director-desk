from app.agents.writer_agent import writer_agent
from app.agents.storyboard_agent import storyboard_agent
from app.schemas.responses import GenerateResponse

class ShowrunnerService:

    def generate(self, prompt: str) -> GenerateResponse:

        script = writer_agent.generate_script(prompt)

        storyboard = storyboard_agent.generate_storyboard(script)

        return GenerateResponse(
            title=f"Generated from: {prompt}",
            script=script,
            storyboard=storyboard
        )


showrunner_service = ShowrunnerService()