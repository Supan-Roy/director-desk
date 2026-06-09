from app.schemas.responses import GenerateResponse

class ShowrunnerService:

    def generate(self, prompt: str) -> GenerateResponse:

        return GenerateResponse(
            title=f"Generated from: {prompt}",
            script=[
                f"Opening scene based on {prompt}",
                "Conflict begins",
                "Final dramatic climax"
            ]
        )


showrunner_service = ShowrunnerService()