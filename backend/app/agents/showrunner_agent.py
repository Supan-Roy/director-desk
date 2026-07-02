import json
import re
import logging
from app.services.qwen_service import qwen_service
from app.schemas.responses import StoryboardScene

logger = logging.getLogger(__name__)

class ShowrunnerAgent:
    name = "showrunner_agent"

    def generate_short_title(self, prompt: str) -> str:
        # Strip aspect ratio/motion tags like [Aspect: 16:9, Style: noir, Motion: Static, Quality: draft]
        clean_prompt = re.sub(r'\[Aspect:[^\]]+\]', '', prompt).strip()
        
        title_prompt = f"""
        Create a short, meaningful, and professional production title (5 to 10 words) for the following creative concept:
        "{clean_prompt}"
        
        Return ONLY the title (do not wrap in quotes, do not add "Title:", do not add any markdown, do not add a period).
        """
        try:
            title = qwen_service.generate_text(title_prompt).strip()
            # Clean title
            title = title.replace('"', '').replace("'", "").replace('.', '').strip()
            if not title or len(title.split()) > 15:
                raise ValueError("Too long or empty title")
            return title
        except Exception as e:
            logger.warning(f"Failed to generate custom title: {e}. Using fallback.")
            # Fallback: clean up the first 8 words of the prompt
            words = [w for w in clean_prompt.split() if not (w.startswith('[') or w.endswith(']'))]
            clean_words = []
            for w in words[:8]:
                clean_w = ''.join(c for c in w if c.isalnum() or c in ['-', '_'])
                if clean_w:
                    clean_words.append(clean_w)
            fallback = " ".join(clean_words).title()
            return fallback or "Untitled Production"

    def detect_production_type(self, prompt: str) -> str:
        detect_prompt = f"""
        Analyze the following prompt and classify it into exactly one of these production formats:
        - "Short Film"
        - "Trailer"
        - "Documentary"
        - "Podcast"
        - "Drama"
        - "Series Episode"
        - "Educational Show"
        - "Interview"
        - "YouTube Video"
        - "Audio Story"

        Prompt: {prompt}

        Return ONLY the name of the category (no extra text, no period, no markdown).
        """
        try:
            detected = qwen_service.generate_text(detect_prompt).strip()
            detected = detected.replace('"', '').replace("'", "").replace('.', '').strip()
            valid_types = [
                "Short Film", "Trailer", "Documentary", "Podcast", "Drama",
                "Series Episode", "Educational Show", "Interview", "YouTube Video", "Audio Story"
            ]
            for vt in valid_types:
                if vt.lower() == detected.lower():
                    return vt
        except Exception as e:
            logger.warning(f"Failed to auto-detect production type: {e}")
        return "Short Film"

    def get_system_prompt(self, prompt: str, production_type: str) -> str:
        if production_type == "Short Film":
            format_rules = """
            - Script: Screenplay format with scene headings (e.g. SCENE 1: INT. ...), action lines, and character dialogue blocks starting with '>'.
            - Storyboard: Yes, detailed scene-by-scene framing, camera shots, environments, and moods.
            - Production Plan: Pre-production preparation, production filming schedules, and post-production editing.
            """
        elif production_type == "Trailer":
            format_rules = """
            - Script: High-impact trailer beats, voiceover cues, fast-paced action sequences, and character dialogue blocks starting with '>'.
            - Storyboard: Yes, high-fidelity visual hooks and key teaser frames.
            - Production Plan: Sound hooks, teaser assembly, and cinematic pacing alignment.
            """
        elif production_type == "Documentary":
            format_rules = """
            - Script: Structured narrative segments, presenter/narrator dialogue starting with '>', and interview snippets.
            - Storyboard: Yes, real-world visual references, map locations, and archival footage mockups.
            - Production Plan: Investigation/research phase, guest/expert interview setups, and footage indexing.
            """
        elif production_type == "Podcast":
            format_rules = """
            - Script: Host dialogue, guest dialogue, episode structure, intro/outro music cues.
            - NO camera instructions, NO visual cinematography directions.
            - Storyboard: Return an empty array [] (no storyboard scenes allowed).
            - Production Plan: Episode recording, audio cleanup, mixing, sound effects layering.
            """
        elif production_type == "Drama":
            format_rules = """
            - Script: Acts, theatrical scenes, deep character arcs, intense dialogue blocks starting with '>'.
            - Storyboard: Yes, character interaction framings and stage blockings.
            - Production Plan: Casting, rehearsals, scene shooting schedules.
            """
        elif production_type == "Series Episode":
            format_rules = """
            - Script: Acts, television scenes, character subplots, episode-level hooks and dialogue blocks starting with '>'.
            - Storyboard: Yes, television-style camera setups.
            - Production Plan: Multi-episode scheduling, production block planning, and editing.
            """
        elif production_type == "Educational Show":
            format_rules = """
            - Script: Lesson structure, clear explanations, graphical insert instructions, and presenter dialogue blocks starting with '>'.
            - Storyboard: Yes, graphic slides, presentation frames, blackboard diagrams.
            - Production Plan: Script mapping, visual slide design, asset compilation.
            """
        elif production_type == "Interview":
            format_rules = """
            - Script: Interviewer dialogue, guest dialogue, discussion topics, and intro/outro.
            - Storyboard: Yes, camera switches between interviewer and guest (or empty if audio).
            - Production Plan: Guest booking, pre-interview outline, multi-cam shooting setup.
            """
        elif production_type == "YouTube Video":
            format_rules = """
            - Script: Attention-grabbing intro hooks, sponsor segments, call-to-actions (like/subscribe), and dialogue blocks starting with '>'.
            - Storyboard: Yes, thumbnail framing, B-roll placeholders, overlays, screen graphics.
            - Production Plan: B-roll cataloging, editing pacing, thumbnail design.
            """
        elif production_type == "Audio Story":
            format_rules = """
            - Script: Narrator blocks, audio atmosphere/ambience cues, sound effects (SFX) instructions.
            - NO camera instructions, NO visual directions.
            - Storyboard: Return an empty array [] (no storyboard scenes allowed).
            - Production Plan: Voice recording, sound effects layering, mixing.
            """
        else:
            format_rules = "Standard screenplay generation rules."

        is_audio = production_type in ["Podcast", "Audio Story"]
        visual_rules = ""
        if not is_audio:
            visual_rules = """
        CRITICAL SCENE DURATION RULES FOR VIDEO GENERATION:
        - Each scene in the script and storyboard must represent a concise narrative beat that lasts exactly 10 to 15 seconds.
        - Do NOT write long, sprawling scenes. If an event or dialogue sequence takes longer than 15 seconds, you MUST break it down into multiple separate, consecutive scenes (e.g., SCENE 1, SCENE 2), each representing 10 to 15 seconds of visual action/dialogue/motion.
        - Each scene's action description and dialogue must be plausible and naturally fit within that 10-15 second block without feeling rushed or requiring sudden cuts.
        """

        system_prompt = f"""
        You are a Showrunner Agent. Orchestrate a full pre-production package (Title, Script, Storyboard, Production Plan, Critic Review) for the following user concept.
        
        Production Format: {production_type}
        
        Concept:
        {prompt}

        CRITICAL USER CONSTRAINT RULE:
        If the user concept/prompt specifies any explicit production constraints (such as a strict limit on the number of scenes, specific locations, pacing, mood, character attributes, or narrative style), you MUST prioritize and strictly adhere to those instructions. Do not let default format generation guidelines override explicit user requests.
 
        Format Generation Rules:
        {format_rules}
        {visual_rules}
 
        You must output ONLY a valid JSON object matching exactly this schema:
        {{
          "title": "Title of the Production",
          "script": "A short production script conforming to the {production_type} rules above. Dialogue blocks must start with '>'.",
          "storyboard": [
            {{
              "scene_number": 1,
              "camera_shot": "Establishing Wide Shot (or 'N/A' for audio)",
              "environment": "Cyberpunk Neon Alley (or 'N/A' for audio)",
              "mood": "Tense and atmospheric"
            }}
          ],
          "production_plan": {{
            "title": "Production Plan Title",
            "phases": [
              {{
                "name": "Pre-Production",
                "status": "complete",
                "items": [
                  "Script finalized",
                  "Asset list compiled"
                ]
              }},
              {{
                "name": "Production",
                "status": "pending",
                "items": [
                  "Recording or rendering"
                ]
              }},
              {{
                "name": "Post-Production",
                "status": "pending",
                "items": [
                  "Editing and final cuts"
                ]
              }}
            ]
          }},
          "critic_review": {{
            "score": 8,
            "strengths": [
              "Concise strength 1",
              "Concise strength 2"
            ],
            "weaknesses": [
              "Concise weakness 1",
              "Concise weakness 2"
            ],
            "suggestions": [
              "Concise suggestion 1",
              "Concise suggestion 2"
            ]
          }}
        }}
 
        IMPORTANT: If this is an audio-only format (like Podcast or Audio Story), "storyboard" MUST be an empty array [].
        Return ONLY the raw JSON object (no markdown code blocks, no trailing text, no introduction).
        """
        return system_prompt
 
    def generate_all(self, prompt: str, production_type: str = "Auto Detect") -> dict:
        if production_type == "Auto Detect" or not production_type:
            production_type = self.detect_production_type(prompt)
            
        system_prompt = self.get_system_prompt(prompt, production_type)
        
        try:
            logger.info(f"Calling Qwen in FAST mode for a single-call structured generation (Format: {production_type})...")
            response_text = qwen_service.generate_text(system_prompt).strip()
            
            # Clean up code block wrap if the LLM provided it
            if response_text.startswith("```"):
                response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
                response_text = re.sub(r"\n```$", "", response_text)
                response_text = response_text.strip()
                
            data = json.loads(response_text)
            
            # Basic validation of expected keys
            if "critic_review" not in data and "critic_notes" in data:
                data["critic_review"] = {
                    "score": 7,
                    "strengths": ["Completed initial draft review."],
                    "weaknesses": ["Script could be expanded."],
                    "suggestions": data["critic_notes"]
                }

            required_keys = ["title", "script", "storyboard", "production_plan", "critic_review"]
            if not all(k in data for k in required_keys):
                raise ValueError("Missing required keys in JSON response")
                
            # Ensure storyboard items match StoryboardScene structure (or empty list if audio)
            parsed_storyboard = []
            is_audio = production_type in ["Podcast", "Audio Story"]
            if not is_audio and isinstance(data.get("storyboard"), list):
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
            data["production_type"] = production_type
            return data
            
        except Exception as e:
            logger.warning(f"FAST mode JSON generation failed: {e}. Falling back to default structures.")
            fallback_title = self.generate_short_title(prompt)
            is_audio = production_type in ["Podcast", "Audio Story"]
            
            fallback_critic_review = {
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

            if is_audio:
                fallback_script = f"# {fallback_title}\n\n[Episode Intro Music Cues]\n\nHOST\n> Welcome to our session on: {prompt}.\n\nGUEST\n> Thank you for having me today."
                fallback_storyboard = []
                fallback_plan = {
                    "title": f"{fallback_title} — Audio Production Plan",
                    "phases": [
                        {
                            "name": "Pre-Production",
                            "status": "complete",
                            "items": ["Script drafted", "Audio outline finalized"]
                        },
                        {
                            "name": "Production",
                            "status": "pending",
                            "items": ["Voice recording session", "Mic calibration"]
                        },
                        {
                            "name": "Post-Production",
                            "status": "pending",
                            "items": ["Audio noise reduction", "Sound effects assembly"]
                        }
                    ]
                }
            else:
                fallback_script = f"# {fallback_title}\n\nSCENE 1: INT. STUDIO - NIGHT\n\nThe director sits in the chair.\n\nDIRECTOR\n> Let's make this show run."
                fallback_storyboard = [
                    StoryboardScene(scene_number=1, camera_shot="Wide Shot", environment="Studio Desk", mood="Focused")
                ]
                fallback_plan = {
                    "title": f"{fallback_title} — Production Plan",
                    "phases": [
                        {
                            "name": "Pre-Production",
                            "status": "complete",
                            "items": ["Script drafted", "Storyboard sketched"]
                        },
                        {
                            "name": "Production",
                            "status": "pending",
                            "items": ["Video rendering"]
                        },
                        {
                            "name": "Post-Production",
                            "status": "pending",
                            "items": ["Timeline assembly"]
                        }
                    ]
                }
                
            return {
                "title": fallback_title,
                "script": fallback_script,
                "storyboard": fallback_storyboard,
                "production_plan": fallback_plan,
                "critic_review": fallback_critic_review,
                "production_type": production_type
            }

showrunner_agent = ShowrunnerAgent()
