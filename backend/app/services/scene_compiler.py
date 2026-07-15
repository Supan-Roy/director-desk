import os
import json
import logging
import uuid
import re
import difflib
from app.db.database import SessionLocal
from app.db.models import Project, CharacterAsset, EnvironmentAsset, SceneVideo
from sqlalchemy import func

logger = logging.getLogger(__name__)


class ScenePackageCompiler:
    @staticmethod
    def _resolve_character_name(raw_name: str, char_assets: list) -> CharacterAsset | None:
        """Resolve character name using exact match, then fuzzy match, then heuristics."""
        trimmed = raw_name.strip().lower()
        if not trimmed:
            return None

        # Tier 1: Exact / Case-insensitive match
        for asset in char_assets:
            if asset.character_name.lower().strip() == trimmed:
                return asset

        # Tier 2: Honorific-stripped match
        titles = ["dr.", "dr", "mr.", "mr", "mrs.", "mrs", "ms.", "ms",
                  "agent", "officer", "captain", "professor", "the"]

        def clean_name(name_str):
            n = name_str.lower().strip()
            for t in titles:
                if n.startswith(t + " "):
                    n = n[len(t) + 1:].strip()
                elif n.startswith(t):
                    n = n[len(t):].strip()
            return n

        cleaned_raw = clean_name(raw_name)
        for asset in char_assets:
            cleaned_asset = clean_name(asset.character_name)
            if (cleaned_raw == cleaned_asset
                    or (len(cleaned_raw) > 2 and cleaned_raw in cleaned_asset)
                    or (len(cleaned_asset) > 2 and cleaned_asset in cleaned_raw)):
                return asset

        # Tier 3: Fuzzy matching via difflib (no LLM call)
        official_names = [c.character_name.lower().strip() for c in char_assets]
        matches = difflib.get_close_matches(cleaned_raw, official_names, n=1, cutoff=0.6)
        if matches:
            for asset in char_assets:
                if asset.character_name.lower().strip() == matches[0]:
                    return asset

        return None

    @staticmethod
    def _resolve_all_scene_characters(project_id: int, db, scene_text: str, scene_chars: list[str]) -> dict[str, CharacterAsset]:
        """Resolve all characters in a scene. No LLM calls needed."""
        char_assets = db.query(CharacterAsset).filter(CharacterAsset.project_id == project_id).all()
        resolved_map = {}
        unresolved_names = []

        for raw_name in scene_chars:
            if not raw_name or not raw_name.strip():
                continue
            asset = ScenePackageCompiler._resolve_character_name(raw_name, char_assets)
            if asset:
                resolved_map[raw_name] = asset
            else:
                unresolved_names.append(raw_name)

        if unresolved_names:
            logger.info(f"Unresolved character names for scene (skipping): {unresolved_names}")

        return resolved_map

    @staticmethod
    def _pick_primary_character(character_appearances: list, project_script: str) -> dict | None:
        """Pick the single most important character in this scene.
        
        Uses simple heuristics: the character who appears in the most scenes
        (from breakdown data) or the first-listed character as fallback.
        """
        if not character_appearances:
            return None
        if len(character_appearances) == 1:
            return character_appearances[0]

        # Score: prefers characters with more screen time (earlier = more important)
        return character_appearances[0]

    @staticmethod
    def compile_scene_package(project_id: int, scene_number: int, scene_dict: dict,
                              previous_scene_video_url: str | None = None) -> dict:
        """
        Compiles the Scene Package containing all production blueprints.
        Acts as the single source of truth for the scene.

        No composite reference boards — uses a single clean character portrait
        or the last frame of the previous scene for continuity.
        """
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise ValueError(f"Project with ID {project_id} not found.")

            scene_chars = scene_dict.get("characters", [])
            if isinstance(scene_chars, str):
                scene_chars = [scene_chars]

            raw_prompt = (scene_dict.get("ai_generation_prompt")
                          or scene_dict.get("summary")
                          or "A cinematic film scene")

            # 1. Resolve characters
            resolved_chars_map = ScenePackageCompiler._resolve_all_scene_characters(
                project_id, db, raw_prompt, scene_chars
            )

            character_references = []
            character_appearances = []

            for raw_name, char_asset in resolved_chars_map.items():
                if not char_asset:
                    continue
                if char_asset.image_url:
                    character_references.append(char_asset.image_url)

                profile = char_asset.character_profile or {}
                character_appearances.append({
                    "name": char_asset.character_name,
                    "age": profile.get("age", "Unknown"),
                    "gender": profile.get("gender", "Unknown"),
                    "appearance": profile.get("appearance", profile.get("visual_profile", "Unknown")),
                    "wardrobe": profile.get("wardrobe", "Unknown"),
                    "hair": profile.get("hair", "Unknown"),
                    "face": profile.get("face", "Unknown"),
                    "accessories": profile.get("accessories", "Unknown"),
                    "color_palette": profile.get("color_palette", "Unknown"),
                    "body_type": profile.get("body_type", "Unknown")
                })

            # 2. Pick primary character
            primary_character = ScenePackageCompiler._pick_primary_character(
                character_appearances, project.script or ""
            )

            # 3. Resolve environment
            location_name = scene_dict.get("location") or scene_dict.get("environment") or ""
            environment_reference = None
            environment_description = {}

            trimmed_loc = location_name.lower().strip()
            if trimmed_loc:
                env_assets = db.query(EnvironmentAsset).filter(EnvironmentAsset.project_id == project_id).all()
                for ea in env_assets:
                    ea_name = ea.environment_name.lower().strip()
                    if ea_name in trimmed_loc or trimmed_loc in ea_name:
                        environment_reference = ea.image_url
                        profile = ea.environment_profile or {}
                        environment_description = {
                            "name": ea.environment_name,
                            "architecture": profile.get("architecture", "Unknown"),
                            "lighting": profile.get("lighting", "Unknown"),
                            "weather": profile.get("weather", "Unknown"),
                            "mood": profile.get("mood", "Unknown"),
                            "color_palette": profile.get("color_palette", "Unknown"),
                            "time_of_day": profile.get("time_of_day", "Unknown")
                        }
                        break

            # 4. Enrich prompt — substitute character names with descriptions (text-only)
            enriched_prompt = raw_prompt
            for char_app in character_appearances:
                name = char_app["name"]
                desc_parts = []
                for key, prefix in [
                    ("body_type", None),
                    ("appearance", None),
                    ("hair", "hair"),
                    ("face", "face"),
                    ("wardrobe", "wearing"),
                    ("accessories", None),
                ]:
                    val = char_app.get(key, "")
                    if val and val != "Unknown":
                        if prefix:
                            desc_parts.append(f"{val} {prefix}")
                        else:
                            desc_parts.append(val)

                desc_str = ", ".join(desc_parts)
                if desc_str:
                    replacement = f"{name} (a {desc_str})"
                else:
                    replacement = name

                pattern = re.compile(rf'\b{re.escape(name)}\b', re.IGNORECASE)
                enriched_prompt = pattern.sub(replacement, enriched_prompt)

            # 5. Environment details in prompt
            if environment_description:
                env_parts = []
                for key in ["architecture", "weather", "mood", "color_palette"]:
                    val = environment_description.get(key, "")
                    if val and val != "Unknown":
                        env_parts.append(f"{key}: {val}")
                if env_parts:
                    enriched_prompt += f". Environment: {location_name} ({', '.join(env_parts)})"

            # 6. Decide on reference image strategy
            #
            #   Continuation: if this scene is in the same location as the previous
            #   scene, use the last frame of the previous scene video as the I2V ref.
            #
            #   Otherwise: use the primary character's clean portrait.
            #
            scene_location = (scene_dict.get("location")
                              or scene_dict.get("environment")
                              or "").lower().strip()

            # We need the previous scene's location to detect continuation.
            # Fetch it from the breakdown if available.
            is_continuation = False
            if previous_scene_video_url and scene_number > 1:
                # Check previous scene location from breakdown
                breakdown = project.scene_breakdown or {}
                scenes = breakdown.get("scenes", [])
                prev_location = None
                for s in scenes:
                    s_num = 0
                    try:
                        d = re.findall(r'\d+', str(s.get("scene_number", "")))
                        if d:
                            s_num = int(d[0])
                    except Exception:
                        pass
                    if s_num == scene_number - 1:
                        prev_location = (s.get("location") or s.get("environment") or "").lower().strip()
                        break

                if prev_location and scene_location and prev_location == scene_location:
                    is_continuation = True
                    logger.info(
                        f"Scene {scene_number} is a continuation of Scene {scene_number - 1} "
                        f"(same location: '{scene_location}'). Using last frame as reference."
                    )

            reference_url = None
            if is_continuation and previous_scene_video_url:
                reference_url = previous_scene_video_url  # last-frame URL set by caller
                reference_type = "last_frame"
            elif environment_reference:
                # Use environment establishing shot as the base first-frame for better blending
                reference_url = environment_reference
                reference_type = "environment"
            elif primary_character:
                # Fallback to character portrait if no environment reference is compiled
                for ref_url in character_references:
                    if primary_character["name"] in ref_url:
                        reference_url = ref_url
                        break
                if not reference_url and character_references:
                    reference_url = character_references[0]
                reference_type = "character_portrait"
            else:
                reference_type = "none"

            # 7. Duration — configurable, clamp 2-20s
            duration_str = scene_dict.get("duration", "10 seconds")
            duration = 10
            try:
                digits = re.findall(r'\d+', str(duration_str))
                if digits:
                    duration = int(digits[0])
            except Exception:
                pass
            duration = max(2, min(20, duration))

            aspect_ratio = project.aspect_ratio or "16:9"

            camera_movement = scene_dict.get("camera_movement") or scene_dict.get("camera_setup") or "Static"
            lighting_design = (scene_dict.get("lighting_design")
                               or (environment_description.get("lighting") if environment_description else "Ambient"))
            negative_prompt = scene_dict.get("negative_prompt") or "cartoon, 3d render, low quality, shaky cam, text"

            package = {
                "project_id": project_id,
                "scene_number": scene_number,
                "scene_description": scene_dict.get("summary", ""),
                "story_context": project.script or "",
                "character_references": character_references,
                "character_appearances": character_appearances,
                "primary_character": primary_character,
                "environment_reference": environment_reference,
                "environment_description": environment_description,
                "lighting_design": lighting_design,
                "camera_movement": camera_movement,
                "camera_setup": scene_dict.get("camera_setup", "Standard"),
                "motion_instructions": f"Camera moving: {camera_movement}. Lighting: {lighting_design}.",
                "negative_prompt": negative_prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "reference_url": reference_url,
                "reference_type": reference_type,
                "is_continuation": is_continuation,
                "enriched_prompt": enriched_prompt,
            }

            # Save manifest
            try:
                os.makedirs("static/uploads/manifests", exist_ok=True)
                manifest_filename = f"manifest_{project_id}_{scene_number}.json"
                manifest_filepath = os.path.join("static/uploads/manifests", manifest_filename)
                with open(manifest_filepath, "w") as f:
                    json.dump(package, f, indent=2)
                logger.info(f"Manifest saved to {manifest_filepath}")
            except Exception as e:
                logger.error(f"Failed to write scene manifest: {e}")

            return package

        finally:
            db.close()
