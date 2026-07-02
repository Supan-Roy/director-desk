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
        For every scene present in the storyboard (or for every scene/segment present in the script if storyboard is not available or this is an audio-only format like Podcast or Audio Story):
        1. Analyze scene/segment content.
        2. Extract production details (speakers/characters, audio/dialogue notes).
        3. Generate technical scene specifications (or N/A for visual fields).
        4. Generate AI-video-ready generation prompts (or N/A for audio-only formats).
        5. Estimate scene duration:
           - Every scene duration MUST be set to exactly "10 seconds" or "15 seconds" depending on the scene's written content (e.g. action density, dialogue duration).
           - Do not set durations below 10 seconds or above 15 seconds.
           - Ensure that the action, dialogues, and motion written in the script for that scene can realistically be performed and fit naturally within that exact 10 or 15 second duration without feeling rushed or cut too early.
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
              "duration": "Duration (e.g., '10 seconds')",
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

        IMPORTANT: If this is an audio-only format (like Podcast or Audio Story), you must analyze the script to identify all active speakers/hosts/guests, list them in "characters_needed" under "asset_requirements", and break down the script into conversational/narrative segments or scenes in the "scenes" list (using "N/A" for visual-only fields like "environment", "camera_setup", "ai_generation_prompt", etc. but populating "audio_notes" with the dialogues and speech text for that segment).
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
                "duration": "10 seconds",
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
                "duration": "10 seconds",
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

        total_runtime_sec = len(scenes_found) * 10
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

    def generate_single_scene_breakdown(
        self,
        prompt: str,
        script: str,
        storyboard_scene: dict,
        scene_idx: int,
        total_scenes: int
    ) -> Dict[str, Any]:
        """
        Generate detailed specs for a single scene.
        """
        sb_scene_str = json.dumps(storyboard_scene, indent=2)
        system_prompt = f"""
        You are the Scene Breakdown Agent, a production coordinator in an AI film studio.
        Your task is to analyze the script and the storyboard scene information, and generate a highly detailed, professional production specification for a SINGLE scene.
        
        PRODUCTION INFO:
        - Original Prompt: {prompt}
        - Script: {script}
        - Storyboard Scene details: {sb_scene_str}
        - Scene Index: SCENE {scene_idx} of {total_scenes}
        
        MISSION:
        Generate detailed scene specifications matching exactly the schema below for SCENE {scene_idx}.
        Every scene duration MUST be set to exactly "10 seconds" or "15 seconds" depending on the scene's content.
        
        You must output ONLY a valid JSON object matching exactly this schema:
        {{
          "scene_number": "SCENE {scene_idx:02d}",
          "title": "Scene Title",
          "duration": "10 seconds" or "15 seconds",
          "summary": "Brief summary of visible events",
          "location": "Location name",
          "environment": "Environment details",
          "time_of_day": "Time of day (e.g. Night, Day, Dusk, Dawn)",
          "weather": "Weather condition",
          "characters": ["Character names"],
          "character_descriptions": "Character visual details",
          "wardrobe": "Wardrobe description",
          "props": ["List of props"],
          "visual_style": "Visual style theme",
          "mood": "Mood description",
          "color_palette": ["List of dominant colors"],
          "camera_setup": "Camera setup",
          "camera_movement": "Camera movement description",
          "shot_type": "Shot type (e.g. Close Up, Wide Shot)",
          "lighting_design": "Lighting description",
          "audio_notes": "Audio notes, dialogue, voice or sound SFX cues",
          "special_effects": "VFX details",
          "transition_notes": "Transition notes",
          "ai_generation_prompt": "Cinematic visual description prompt for AI video generator (focus on visible actions, camera, lighting, and motion)",
          "negative_prompt": "Negative prompt text"
        }}
        
        Return ONLY the raw JSON object (no markdown code blocks, no trailing text, no introduction).
        """
        try:
            response_text = qwen_service.generate_text(system_prompt).strip()
            if response_text.startswith("```"):
                response_text = re.sub(r"^```[a-zA-Z]*\n", "", response_text)
                response_text = re.sub(r"\n```$", "", response_text)
                response_text = response_text.strip()
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"Failed to generate single scene breakdown for scene {scene_idx}: {e}")
            s = storyboard_scene
            s_scene = s.get("scene", s.get("scene_number", scene_idx))
            s_shot = s.get("shot", s.get("camera_shot", "Wide Shot"))
            s_env = s.get("environment", "Set")
            s_mood = s.get("mood", "Neutral")
            return {
                "scene_number": f"SCENE {scene_idx:02d}",
                "title": s_shot,
                "duration": "10 seconds",
                "summary": f"Visual scene demonstrating {s_shot} in {s_env}.",
                "location": s_env,
                "environment": s_env,
                "time_of_day": "Day",
                "weather": "Clear",
                "characters": [],
                "character_descriptions": "N/A",
                "wardrobe": "N/A",
                "props": [],
                "visual_style": "Cinematic",
                "mood": s_mood,
                "color_palette": ["cinematic colors"],
                "camera_setup": "Standard Setup",
                "camera_movement": "Static",
                "shot_type": s_shot,
                "lighting_design": "Natural lighting",
                "audio_notes": "Ambient sound",
                "special_effects": "None",
                "transition_notes": "Cut",
                "ai_generation_prompt": f"Grounded cinematic shot, {s_shot} in {s_env}, {s_mood} mood, natural lighting, high quality",
                "negative_prompt": "blurry, low quality, cartoon, static"
            }

    def generate_breakdown_progressive(
        self,
        prompt: str,
        script: str,
        storyboard_scenes: list
    ):
        """
        Progressively generates scene breakdown card by card.
        Yields the breakdown dictionary after each card is generated.
        """
        scenes = []
        total_runtime_seconds = 0
        all_characters = set()
        all_locations = set()
        all_props = set()
        all_sounds = set()
        all_vfx = set()

        total_scenes = len(storyboard_scenes)
        
        # Initial empty breakdown structure to begin streaming immediately
        breakdown_accumulated = {
            "total_runtime": "Calculating...",
            "consistency_warnings": [],
            "scenes": [],
            "asset_requirements": {
                "characters_needed": [],
                "locations_needed": [],
                "props_needed": [],
                "sound_requirements": [],
                "vfx_requirements": []
            }
        }
        yield breakdown_accumulated

        for idx, s in enumerate(storyboard_scenes, 1):
            s_dict = {
                "scene_number": s.scene_number if hasattr(s, "scene_number") else s.get("scene_number", s.get("scene", idx)),
                "camera_shot": s.camera_shot if hasattr(s, "camera_shot") else s.get("camera_shot", s.get("shot", "Wide Shot")),
                "environment": s.environment if hasattr(s, "environment") else s.get("environment", s.get("location", "Set")),
                "mood": s.mood if hasattr(s, "mood") else s.get("mood", "Neutral")
            }
            
            # Generate single scene card spec
            scene_card = self.generate_single_scene_breakdown(prompt, script, s_dict, idx, total_scenes)
            scenes.append(scene_card)

            # Process duration
            dur_str = scene_card.get("duration", "10 seconds")
            try:
                dur_val = int(re.search(r'\d+', dur_str).group())
            except Exception:
                dur_val = 10
            total_runtime_seconds += dur_val

            # Accumulate assets
            for char in scene_card.get("characters", []):
                if char: all_characters.add(char.strip())
            loc = scene_card.get("location")
            if loc: all_locations.add(loc.strip())
            for prop in scene_card.get("props", []):
                if prop: all_props.add(prop.strip())
            audio_n = scene_card.get("audio_notes")
            if audio_n and "dialogue" not in audio_n.lower():
                all_sounds.add(audio_n.strip())
            vfx = scene_card.get("special_effects")
            if vfx and vfx.lower() != "none" and vfx.lower() != "n/a":
                all_vfx.add(vfx.strip())

            breakdown_accumulated = {
                "total_runtime": f"{total_runtime_seconds} seconds",
                "consistency_warnings": [],
                "scenes": list(scenes),
                "asset_requirements": {
                    "characters_needed": sorted(list(all_characters)),
                    "locations_needed": sorted(list(all_locations)),
                    "props_needed": sorted(list(all_props)),
                    "sound_requirements": sorted(list(all_sounds)) if all_sounds else ["Cinematic atmospheric track"],
                    "vfx_requirements": sorted(list(all_vfx))
                }
            }
            yield breakdown_accumulated

        # Final audit step to extract consistency warnings!
        try:
            logger.info("Running consistency audit over generated scenes breakdown...")
            audit_prompt = f"""
            Perform a production consistency audit across the following generated scene specs.
            Check for inconsistencies in character wardrobe, locations, times of day, lighting, or props.
            
            Script:
            {script}
            
            Detailed Scenes:
            {json.dumps(scenes, indent=2)}
            
            Return a JSON list of consistency warnings (e.g., ["Scene 2 has daylight but Scene 1 was night"]).
            If no warnings are found, return exactly [].
            Return ONLY the raw JSON list (no introduction, no markdown).
            """
            audit_resp = qwen_service.generate_text(audit_prompt).strip()
            if audit_resp.startswith("```"):
                audit_resp = re.sub(r"^```[a-zA-Z]*\n", "", audit_resp)
                audit_resp = re.sub(r"\n```$", "", audit_resp)
                audit_resp = audit_resp.strip()
            warnings = json.loads(audit_resp)
            if isinstance(warnings, list):
                breakdown_accumulated["consistency_warnings"] = warnings
        except Exception as e:
            logger.warning(f"Failed to generate consistency warnings audit: {e}")

        yield breakdown_accumulated

scene_breakdown_agent = SceneBreakdownAgent()
