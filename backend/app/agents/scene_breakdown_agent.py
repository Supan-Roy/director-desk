import json
import re
import logging
from typing import Optional, Dict, Any
from app.services.qwen_service import qwen_service

logger = logging.getLogger(__name__)

class SceneBreakdownAgent:
    name = "scene_breakdown_agent"

    def describe(self) -> str:
        return (
            "Transforms storyboard scenes and scripts into structured, "
            "AI-video-ready generation prompts and specifications."
        )

    def generate_breakdown(
        self,
        prompt: str,
        script: str,
        storyboard_text: str,
        production_plan: Optional[dict] = None
    ) -> Dict[str, Any]:
        """
        Generate structured scene specifications and prompts optimized for AI video generators.
        """
        plan_str = json.dumps(production_plan, indent=2) if production_plan else "N/A"
        
        system_prompt = f"""
        You are the Scene Breakdown Agent, a production coordinator in an AI film studio.
        Your job is to act as the bridge between Storyboard/Script and AI Video Generation.
        You must analyze the inputs and generate a structured Scene Breakdown report optimized for models like HappyHorse, Wan, Veo, etc.

        INPUTS:
        - Original User Idea: {prompt}
        - Script: {script}
        - Storyboard: {storyboard_text}
        - Production Plan: {plan_str}

        MISSION:
        For every scene present in the storyboard:
        1. Analyze scene content.
        2. Extract production details.
        3. Generate technical scene specifications.
        4. Generate AI-video-ready generation prompts.
           - Prompts must be visual, specific, cinematic, and model-friendly.
           - Focus on visible actions, environment, camera, lighting, and motion.
           - Avoid abstract storytelling language, internal thoughts, and non-visual descriptions.
        5. Estimate scene duration based on:
           - Dialogue-heavy scenes: 10–20 seconds
           - Action scenes: 5–12 seconds
           - Establishing shots: 3–8 seconds
           - Montage shots: 2–6 seconds
        6. Prepare output for downstream Production Agent.

        Consistency Check:
        - Maintain consistency across scenes (character appearance, wardrobe, locations, color themes, camera language).
        - Detect any inconsistencies and list them as warnings in the "consistency_warnings" array.

        You must output ONLY a valid JSON object matching exactly this schema:
        {{
          "total_runtime": "Total estimated runtime (e.g. '32 seconds')",
          "consistency_warnings": [
            "Any warning if inconsistencies are detected (e.g., Character hair color mismatch), otherwise empty list []"
          ],
          "scenes": [
            {{
              "scene_number": "SCENE 01",
              "title": "Scene Title",
              "duration": "Duration (e.g., '8 seconds')",
              "summary": "Brief summary of visible events",
              "location": "Location name",
              "environment": "Environment details (e.g., rain-slicked neon street)",
              "time_of_day": "Time of day (e.g. Night, Day, Dusk, Dawn)",
              "weather": "Weather condition (e.g. Heavy Rain, Fog, Clear)",
              "characters": ["Character names"],
              "character_descriptions": "Character visual details (e.g. Female detective, black trench coat)",
              "wardrobe": "Wardrobe description",
              "props": ["List of props"],
              "visual_style": "Visual style theme",
              "mood": "Mood description",
              "color_palette": ["List of dominant colors"],
              "camera_setup": "Camera model/lens details (e.g. 35mm Lens)",
              "camera_movement": "Camera movement description (e.g. Slow Dolly Forward)",
              "shot_type": "Shot type (e.g. Medium Tracking Shot)",
              "lighting_design": "Lighting description (e.g. Neon reflections, high-contrast keys)",
              "audio_notes": "Audio notes, dialogue hints, or sound design cues",
              "special_effects": "VFX details (e.g. Rain particles, Neon flicker)",
              "transition_notes": "Transition notes (e.g. Fade into next scene)",
              "ai_generation_prompt": "Cinematic visual description prompt for AI video generator (focus on visible actions, camera, lighting, and motion)",
              "negative_prompt": "Negative prompt text"
            }}
          ],
          "asset_requirements": {{
            "characters_needed": ["List of characters needed across all scenes"],
            "locations_needed": ["List of locations needed across all scenes"],
            "props_needed": ["List of props needed across all scenes"],
            "sound_requirements": ["List of audio assets / SFX needed"],
            "vfx_requirements": ["List of VFX requirements across all scenes"]
          }}
        }}

        IMPORTANT: If this is an audio-only format (like Podcast or Audio Story), return empty lists or "N/A" for visual-only fields, but still provide structural audio breakdowns and sound details.
        Return ONLY the raw JSON object (no markdown code blocks, no trailing text, no introduction).
        """

        try:
            logger.info("Calling Qwen to generate Scene Breakdown...")
            response_text = qwen_service.generate_text(system_prompt).strip()
            
            # Clean up markdown code blocks if the LLM provided them
            if response_text.startswith("```"):
                response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
                response_text = re.sub(r"\n```$", "", response_text)
                response_text = response_text.strip()

            breakdown_data = json.loads(response_text)
            
            # Basic key validation
            required_keys = ["total_runtime", "consistency_warnings", "scenes", "asset_requirements"]
            if all(k in breakdown_data for k in required_keys):
                logger.info("Scene breakdown parsed successfully.")
                return breakdown_data
            else:
                logger.warning("Parsed breakdown is missing some required keys. Creating fallback.")
        except Exception as e:
            logger.error(f"Failed to generate or parse scene breakdown JSON: {e}", exc_info=True)

        return self.get_fallback_breakdown(prompt, script, storyboard_text)

    def get_fallback_breakdown(self, prompt: str, script: str, storyboard_text: str) -> Dict[str, Any]:
        """
        Creates a basic fallback breakdown matching the storyboard scenes structure.
        """
        # Parse scene count from storyboard text if possible
        scenes_found = []
        scene_blocks = re.split(r"---|Scene Number:", storyboard_text)
        
        idx = 1
        for block in scene_blocks:
            if not block.strip():
                continue
            
            # Extract basic scene details using simple regex
            camera_match = re.search(r"Camera Shot:\s*(.*)", block, re.IGNORECASE)
            env_match = re.search(r"Environment:\s*(.*)", block, re.IGNORECASE)
            mood_match = re.search(r"Mood:\s*(.*)", block, re.IGNORECASE)
            
            camera = camera_match.group(1).strip() if camera_match else "Establishing Shot"
            env = env_match.group(1).strip() if env_match else "Main Set"
            mood = mood_match.group(1).strip() if mood_match else "Atmospheric"
            
            scenes_found.append({
                "scene_number": f"SCENE {idx:02d}",
                "title": f"Scene {idx}",
                "duration": "8 seconds",
                "summary": f"Visual scene demonstrating {camera.lower()} in {env.lower()}.",
                "location": env,
                "environment": f"Main setup for {env}",
                "time_of_day": "Night" if "night" in storyboard_text.lower() else "Day",
                "weather": "Clear",
                "characters": ["Main Actor"],
                "character_descriptions": "Standard production actor profile",
                "wardrobe": "Standard scene attire",
                "props": ["Ambient objects"],
                "visual_style": "Cinematic",
                "mood": mood,
                "color_palette": ["Cinematic colors"],
                "camera_setup": "35mm Prime Lens",
                "camera_movement": "Slow Pan",
                "shot_type": camera,
                "lighting_design": "Natural key light",
                "audio_notes": "Ambient sound effects",
                "special_effects": "None",
                "transition_notes": "Cut to next scene",
                "ai_generation_prompt": f"A cinematic {camera.lower()} of {env.lower()}, {mood.lower()} mood, professional lighting, detailed 4k render.",
                "negative_prompt": "low quality, blurry, extra limbs, bad anatomy, text, watermark"
            })
            idx += 1

        if not scenes_found:
            # Absolute basic fallback
            scenes_found = [{
                "scene_number": "SCENE 01",
                "title": "Establishing Sequence",
                "duration": "8 seconds",
                "summary": "An establishing shot showcasing the main concept.",
                "location": "Main Set",
                "environment": "Standard visual space",
                "time_of_day": "Day",
                "weather": "Clear",
                "characters": ["Actor"],
                "character_descriptions": "Visual actor",
                "wardrobe": "Standard clothing",
                "props": ["Visual props"],
                "visual_style": "Cinematic",
                "mood": "Atmospheric",
                "color_palette": ["Primary colors"],
                "camera_setup": "35mm Lens",
                "camera_movement": "Static",
                "shot_type": "Establishing Shot",
                "lighting_design": "Key lighting",
                "audio_notes": "Ambient soundscape",
                "special_effects": "None",
                "transition_notes": "Fade out",
                "ai_generation_prompt": f"A cinematic establishing shot of the main production scene. High detail, 4k, cinematic lighting.",
                "negative_prompt": "low quality, blurry, extra limbs, bad anatomy, text, watermark"
            }]

        total_runtime_sec = len(scenes_found) * 8
        return {
            "total_runtime": f"{total_runtime_sec} seconds",
            "consistency_warnings": [],
            "scenes": scenes_found,
            "asset_requirements": {
                "characters_needed": ["Main Actor"],
                "locations_needed": [s["location"] for s in scenes_found],
                "props_needed": ["Ambient props"],
                "sound_requirements": ["Ambient track"],
                "vfx_requirements": ["None"]
            }
        }

scene_breakdown_agent = SceneBreakdownAgent()
