from app.agents.writer_agent import writer_agent
from app.agents.storyboard_agent import storyboard_agent
from app.services.storyboard_parser import storyboard_parser
from app.schemas.responses import GenerateResponse


class ShowrunnerService:

    def generate(self, prompt: str) -> GenerateResponse:

        script = writer_agent.generate_script(prompt)

        storyboard_text = storyboard_agent.generate_storyboard(script)

        storyboard = storyboard_parser.parse(
            storyboard_text
        )

        return GenerateResponse(
            title=f"Generated from: {prompt}",
            script=script,
            storyboard=storyboard
        )


showrunner_service = ShowrunnerService()