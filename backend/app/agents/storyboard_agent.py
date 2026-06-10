from app.services.qwen_service import qwen_service

class StoryboardAgent:

    def generate_storyboard(self, script: str):

        storyboard = qwen_service.generate_text(
        f"""
        Convert the script into a storyboard.

        Return ONLY this format:

        Scene Number: 1
        Camera Shot: Wide Shot
        Environment: Cyberpunk City
        Mood: Tense
        ---

        Scene Number: 2
        Camera Shot: Close Up
        Environment: Underground Base
        Mood: Suspenseful

        Script:
        {script}
        """
    )

        return storyboard


storyboard_agent = StoryboardAgent()