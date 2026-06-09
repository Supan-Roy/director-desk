class WriterAgent:

    def generate_script(self, prompt: str):

        return [
            f"Opening scene based on {prompt}",
            "Conflict begins",
            "Final dramatic climax"
        ]


writer_agent = WriterAgent()