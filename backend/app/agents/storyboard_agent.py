from app.services.qwen_service import qwen_service

class StoryboardAgent:

    def generate_storyboard(self, script: str):

        storyboard = qwen_service.generate_text(
            f"""
            Convert this script into a storyboard.

            For each scene provide:
            - Scene Number
            - Camera Shot
            - Environment
            - Mood

            Script:
            {script}
            """
        )

        return storyboard


storyboard_agent = StoryboardAgent()