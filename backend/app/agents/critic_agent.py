from app.services.qwen_service import qwen_service
import json

class CriticAgent:
    name = "critic_agent"

    def generate_review(self, script: str, storyboard_text: str) -> dict:
        prompt = f"""
        You are a Critic Agent in a film production crew.
        Review the following script and storyboard, focusing on:
        - Structure
        - Pacing
        - Clarity
        - Engagement
        - Production-specific quality
        
        Provide structured feedback. You must return ONLY a JSON object matching this schema:
        {{
          "score": 8, // A score out of 10
          "strengths": ["...", "..."], // Concise, actionable strengths
          "weaknesses": ["...", "..."], // Concise, actionable weaknesses
          "suggestions": ["...", "..."] // Concise, actionable suggestions for improvement
        }}

        Script:
        {script}

        Storyboard:
        {storyboard_text}

        Return ONLY the raw JSON object (no formatting, no markdown code block).
        """
        response_text = qwen_service.generate_text(prompt).strip()
        
        # Clean up any markdown code blocks
        if response_text.startswith("```"):
            import re
            response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
            response_text = re.sub(r"\n```$", "", response_text)
            response_text = response_text.strip()
            
        try:
            review = json.loads(response_text)
            # Ensure it has all required keys
            for k in ["score", "strengths", "weaknesses", "suggestions"]:
                if k not in review:
                    raise ValueError(f"Missing key: {k}")
            return review
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to parse critic review: {e}. Falling back to default review.")
            
        # Fallback if parsing fails
        return {
            "score": 7,
            "strengths": [
                "Good core narrative structure.",
                "Well-defined character dialogue blocks."
            ],
            "weaknesses": [
                "Pacing could be accelerated in the second act.",
                "Lighting details are slightly sparse."
            ],
            "suggestions": [
                "Ensure the pacing aligns well with the visual shot transitions.",
                "Consider adding more depth to the environment details.",
                "Verify that key lighting and mood descriptors are consistent across scenes."
            ]
        }

    def generate_notes(self, script: str, storyboard_text: str) -> list[str]:
        review = self.generate_review(script, storyboard_text)
        return review.get("suggestions", [])

critic_agent = CriticAgent()
