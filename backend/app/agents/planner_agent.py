from app.services.qwen_service import qwen_service
import json

class PlannerAgent:
    name = 'planner_agent'

    def describe(self) -> str:
        return 'Generates a production plan with pre-production, production, and post-production phases.'

    def generate_plan(self, title: str, script: str, storyboard_text: str, production_type: str = "Short Film") -> dict:
        is_audio = production_type in ["Podcast", "Audio Story"]
        
        phase_guidelines = f"Generate items tailored specifically for a {production_type}."
        if is_audio:
            phase_guidelines += "\nFocus on audio-first tasks. Pre-production: outline preparation, host/guest brief, and mic check. Production: vocal recording session, audio levels monitoring. Post-production: sound effects layering, noise gate/EQ, mixing, and audio export."
        else:
            phase_guidelines += "\nFocus on visual tasks. Pre-production: location scouting, storyboard mapping, set references. Production: filming/rendering, lens/shutter setup. Post-production: scene assembly, editing cuts, color grading, audio score mix."

        prompt = f"""
        You are a Production Planner Agent in a production studio.
        Based on the following script and storyboard (if applicable), generate a structured production plan for a {production_type}.
        
        Title: {title}
        Script: {script}
        Storyboard: {storyboard_text}

        Guidelines:
        {phase_guidelines}

        Return a JSON object matching this schema:
        {{
          "title": "Production Plan Title",
          "phases": [
            {{
              "name": "Pre-Production",
              "status": "complete",
              "items": [
                "Detailed action item 1 (must relate to the {production_type} format/script)",
                "Detailed action item 2"
              ]
            }},
            {{
              "name": "Production",
              "status": "pending",
              "items": [
                "Detailed action item 1",
                "Detailed action item 2"
              ]
            }},
            {{
              "name": "Post-Production",
              "status": "pending",
              "items": [
                "Detailed action item 1",
                "Detailed action item 2"
              ]
            }}
          ]
        }}

        Return ONLY the raw JSON object (no markdown code blocks, no other text).
        """
        response_text = qwen_service.generate_text(prompt).strip()
        
        # Clean up code blocks if present
        if response_text.startswith("```"):
            import re
            response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
            response_text = re.sub(r"\n```$", "", response_text)
            response_text = response_text.strip()
            
        try:
            plan = json.loads(response_text)
            if isinstance(plan, dict) and "phases" in plan:
                return plan
        except Exception:
            pass
            
        # Fallback if parsing fails
        return {
            "title": f"{title} — Production Plan",
            "phases": [
                {
                    "name": "Pre-Production",
                    "status": "complete",
                    "items": [
                        "Script finalized by Writer Agent",
                        "Storyboard scenes mapped out",
                        "Character profiles generated"
                    ]
                },
                {
                    "name": "Production",
                    "status": "pending",
                    "items": [
                        "Scene-by-scene image generation",
                        "Camera movement simulation",
                        "Lighting and mood refinement"
                    ]
                },
                {
                    "name": "Post-Production",
                    "status": "pending",
                    "items": [
                        "Scene assembly and transitions",
                        "Sound design and scoring",
                        "Final quality review and grading"
                    ]
                }
            ]
        }

planner_agent = PlannerAgent()
