import json
import re
import logging
from app.services.qwen_service import qwen_service
from app.schemas.responses import StoryboardScene

logger = logging.getLogger(__name__)

class ShowrunnerAgent:
    name = "showrunner_agent"

    def generate_all(self, prompt: str) -> dict:
        system_prompt = f"""
        You are a Showrunner Agent. Orchestrate a full pre-production package (Title, Script, Storyboard, Production Plan, Critic Notes) for the following user concept in a single structured JSON response.

        Concept:
        {prompt}

        You must output ONLY a valid JSON object matching exactly this schema:
        {{
          "title": "Title of the Movie/Show",
          "script": "A short movie script or screenplay text (containing 5 to 7 scenes with clear headings like 'SCENE 1: INT. ...' and dialogue blocks starting with '>'). Try to include actor parentheticals and character names in UPPERCASE.",
          "storyboard": [
            {{
              "scene_number": 1,
              "camera_shot": "Establishing Wide Shot",
              "environment": "Cyberpunk Neon Alley",
              "mood": "Tense and atmospheric"
            }},
            {{
              "scene_number": 2,
              "camera_shot": "Medium Close-up",
              "environment": "Dark Room",
              "mood": "Suspenseful"
            }},
            {{
              "scene_number": 3,
              "camera_shot": "Low Angle Panning Shot",
              "environment": "City Rooftops",
              "mood": "Climactic"
            }},
            {{
              "scene_number": 4,
              "camera_shot": "Tracking Shot",
              "environment": "Underground Metro Station",
              "mood": "Ominous"
            }},
            {{
              "scene_number": 5,
              "camera_shot": "Close-up Detail Shot",
              "environment": "Control Terminal Room",
              "mood": "Suspenseful"
            }}
          ],
          "production_plan": {{
            "title": "Production Plan Title",
            "phases": [
              {{
                "name": "Pre-Production",
                "status": "complete",
                "items": [
                  "Script finalized by Showrunner Agent",
                  "Storyboard mapped out (5 scenes)",
                  "Setting profiles prepared"
                ]
              }},
              {{
                "name": "Production",
                "status": "pending",
                "items": [
                  "Scene rendering",
                  "Camera movement simulation"
                ]
              }},
              {{
                "name": "Post-Production",
                "status": "pending",
                "items": [
                  "Editing and final cuts",
                  "Critic notes review"
                ]
              }}
            ]
          }},
          "critic_notes": [
            "Critic note 1 about story pacing or cinematic shots",
            "Critic note 2 about visual continuity",
            "Critic note 3 about mood setting and audio recommendations"
          ]
        }}

        Return ONLY the raw JSON object (no markdown code blocks, no trailing text, no introduction).
        """
        
        try:
            logger.info("Calling Qwen in FAST mode for a single-call structured generation...")
            response_text = qwen_service.generate_text(system_prompt).strip()
            
            # Clean up code block wrap if the LLM provided it
            if response_text.startswith("```"):
                response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
                response_text = re.sub(r"\n```$", "", response_text)
                response_text = response_text.strip()
                
            data = json.loads(response_text)
            
            # Basic validation of expected keys
            required_keys = ["title", "script", "storyboard", "production_plan", "critic_notes"]
            if not all(k in data for k in required_keys):
                raise ValueError("Missing required keys in JSON response")
                
            # Ensure storyboard items match StoryboardScene structure
            parsed_storyboard = []
            for scene in data["storyboard"]:
                parsed_storyboard.append(
                    StoryboardScene(
                        scene_number=int(scene.get("scene_number", 1)),
                        camera_shot=str(scene.get("camera_shot", "Wide Shot")),
                        environment=str(scene.get("environment", "Default Studio")),
                        mood=str(scene.get("mood", "Neutral"))
                    )
                )
            data["storyboard"] = parsed_storyboard
            return data
            
        except Exception as e:
            logger.warning(f"FAST mode JSON generation failed or parsed incorrectly: {e}. Falling back to default structures.")
            # Graceful fallback logic
            fallback_title = f"Generated from: {prompt}"
            fallback_script = f"# {fallback_title}\n\nSCENE 1: INT. STUDIO - NIGHT\n\nThe director sits in the chair, looking over scripts.\n\nDIRECTOR\n(smiling)\n> Let's make this show run.\n\nSCENE 2: EXT. STREET - RAIN\n\nRain splatters on neon billboards.\n\nSCENE 3: INT. CONTROL ROOM - NIGHT\n\nScreens flicker with neon light.\n\nSCENE 4: EXT. HIGHWAY - NIGHT\n\nA hover car zooms past.\n\nSCENE 5: INT. WAREHOUSE - DAWN\n\nA dust ray streams through broken glass."
            fallback_storyboard = [
                StoryboardScene(scene_number=1, camera_shot="Wide Shot", environment="Studio Desk", mood="Focused"),
                StoryboardScene(scene_number=2, camera_shot="Close Up", environment="Rainy Street", mood="Atmospheric"),
                StoryboardScene(scene_number=3, camera_shot="Detail Shot", environment="Control Panels", mood="Creative"),
                StoryboardScene(scene_number=4, camera_shot="Tracking Shot", environment="City Highway", mood="Action"),
                StoryboardScene(scene_number=5, camera_shot="Static Shot", environment="Abandoned Warehouse", mood="Mysterious")
            ]
            fallback_plan = {
                "title": f"{fallback_title} — Production Plan",
                "phases": [
                    {
                        "name": "Pre-Production",
                        "status": "complete",
                        "items": ["Script drafted (5 scenes)", "Scenes outline finalized"]
                    },
                    {
                        "name": "Production",
                        "status": "pending",
                        "items": ["Asset collection", "Image generation setup"]
                    },
                    {
                        "name": "Post-Production",
                        "status": "pending",
                        "items": ["Timeline assembly"]
                    }
                ]
            }
            fallback_critic_notes = [
                "Ensure spacing between camera motions fits dialog length.",
                "Review the lighting parameters under light mode for contrast.",
                "Verify character continuity in scene 3."
            ]
            return {
                "title": fallback_title,
                "script": fallback_script,
                "storyboard": fallback_storyboard,
                "production_plan": fallback_plan,
                "critic_notes": fallback_critic_notes
            }

showrunner_agent = ShowrunnerAgent()
