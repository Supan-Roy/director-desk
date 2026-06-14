from app.services.qwen_service import qwen_service
import logging

logger = logging.getLogger(__name__)

class EditorAgent:
    name = "editor_agent"

    def refine_script(self, original_script: str, critic_review: dict) -> str:
        strengths = "\n".join(f"- {s}" for s in critic_review.get("strengths", []))
        weaknesses = "\n".join(f"- {w}" for w in critic_review.get("weaknesses", []))
        suggestions = "\n".join(f"- {s}" for s in critic_review.get("suggestions", []))

        prompt = f"""
        You are an Editor Agent in a film production studio.
        Your task is to refine the following original script based on the Critic Review feedback.

        Original Script:
        {original_script}

        Critic Review Feedback:
        Strengths:
        {strengths}
        
        Weaknesses:
        {weaknesses}
        
        Suggestions:
        {suggestions}

        Guidelines for refinement:
        - Apply the improvements suggested in the critic review.
        - Maintain the original narrative intent, characters, and voice.
        - Avoid rewriting parts of the script that are already strong or do not need modification.
        - Keep the screenplay/script formatting exactly the same as the original. In particular, spoken dialogue lines MUST start with '>' (e.g. '> Hello').
        - Output the refined script in its entirety. Do NOT output any preamble, introductory remarks, explanation, or markdown other than screenplay headers.
        """
        logger.info("Calling Editor Agent to refine script...")
        refined_script = qwen_service.generate_text(prompt).strip()
        
        # Clean up markdown block wraps if returned by the model
        if refined_script.startswith("```"):
            import re
            refined_script = re.sub(r"^```[a-zA-Z]*\n", "", refined_script)
            refined_script = re.sub(r"\n```$", "", refined_script)
            refined_script = refined_script.strip()
            
        return refined_script

editor_agent = EditorAgent()
