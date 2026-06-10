from app.agents.writer_agent import writer_agent
from app.agents.storyboard_agent import storyboard_agent
from app.services.storyboard_parser import storyboard_parser
from app.services.project_state import project_state
from app.schemas.responses import GenerateResponse


class ShowrunnerService:

    def generate(self, prompt: str) -> GenerateResponse:

        script = writer_agent.generate_script(prompt)

        storyboard_text = storyboard_agent.generate_storyboard(script)

        storyboard = storyboard_parser.parse(
            storyboard_text
        )

        title = f"Generated from: {prompt}"

        project_state.set_generation_complete(title, script, storyboard)

        return GenerateResponse(
            title=title,
            script=script,
            storyboard=storyboard
        )


showrunner_service = ShowrunnerService()