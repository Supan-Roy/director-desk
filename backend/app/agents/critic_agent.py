from app.services.qwen_service import qwen_service
import json

class CriticAgent:
    name = "critic_agent"

    def generate_notes(self, script: str, storyboard_text: str) -> list[str]:
        prompt = f"""
        You are a Critic Agent in a film production crew.
        Review the following script and storyboard, then provide 3 critical review notes / suggestions for improvement.
        
        Script:
        {script}

        Storyboard:
        {storyboard_text}

        Return a JSON list of strings representing the 3 review notes.
        Return ONLY the raw JSON list of strings (no formatting, no markdown code block). Example:
        ["Note 1", "Note 2", "Note 3"]
        """
        response_text = qwen_service.generate_text(prompt).strip()
        
        # Clean up any markdown code blocks
        if response_text.startswith("```"):
            import re
            response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
            response_text = re.sub(r"\n```$", "", response_text)
            response_text = response_text.strip()
            
        try:
            notes = json.loads(response_text)
            if isinstance(notes, list):
                return [str(n) for n in notes]
        except Exception:
            pass
            
        # Fallback if parsing fails
        return [
            "Ensure the pacing aligns well with the visual shot transitions.",
            "Consider adding more depth to the environment details.",
            "Verify that key lighting and mood descriptors are consistent across scenes."
        ]

critic_agent = CriticAgent()
