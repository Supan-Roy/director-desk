from app.services.qwen_service import qwen_service


class WriterAgent:

    def generate_script(self, prompt: str):

        script = qwen_service.generate_text(
            f"""
            Create a short movie trailer script.

            Idea:
            {prompt}

            Return 3 scenes.
            """
        )

        return [script]


writer_agent = WriterAgent()