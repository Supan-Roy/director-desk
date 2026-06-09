from app.agents.writer_agent import writer_agent
from app.schemas.responses import GenerateResponse

class ShowrunnerService:

    def generate(self, prompt: str) -> GenerateResponse:

        script = writer_agent.generate_script(prompt)

        return GenerateResponse(
            title=f"Generated from: {prompt}",
            script=script
        )

showrunner_service = ShowrunnerService()