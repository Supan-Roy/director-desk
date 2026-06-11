from app.services.qwen_service import qwen_service
import json

class PlannerAgent:
    name = 'planner_agent'

    def describe(self) -> str:
        return 'Generates a production plan with pre-production, production, and post-production phases.'

    def generate_plan(self, title: str, script: str, storyboard_text: str) -> dict:
        prompt = f"""
        You are a Production Planner Agent in a film studio.
        Based on the following script and storyboard, generate a structured production plan containing three phases: "Pre-Production", "Production", and "Post-Production".
        
        Title: {title}
        Script: {script}
        Storyboard: {storyboard_text}

        Return a JSON object matching this schema:
        {{
          "title": "Production Plan Title",
          "phases": [
            {{
              "name": "Pre-Production",
              "status": "complete",
              "items": [
                "Detailed action item 1 (must relate to the script/storyboard)",
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
