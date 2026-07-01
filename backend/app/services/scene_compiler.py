import os
import json
import logging
import uuid
import re
from app.db.database import SessionLocal
from app.db.models import Project, CharacterAsset, EnvironmentAsset
from sqlalchemy import func
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)

class ScenePackageCompiler:
    @staticmethod
    def compile_scene_package(project_id: int, scene_number: int, scene_dict: dict) -> dict:
        """
        Compiles the Scene Package containing all production blueprints.
        Acts as the single source of truth for the scene.
        """
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise ValueError(f"Project with ID {project_id} not found.")

            # 1. Resolve character assets & appearances
            scene_chars = scene_dict.get("characters", [])
            if isinstance(scene_chars, str):
                scene_chars = [scene_chars]

            character_references = []
            character_appearances = []

            for char in scene_chars:
                trimmed = char.lower().strip()
                if not trimmed:
                    continue
                char_asset = db.query(CharacterAsset).filter(
                    CharacterAsset.project_id == project_id,
                    func.lower(CharacterAsset.character_name) == trimmed
                ).first()
                
                if char_asset:
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

            # 2. Resolve environment asset & descriptions
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

            # 3. Dynamic character prompt enrichment (substitution)
            raw_prompt = scene_dict.get("ai_generation_prompt") or scene_dict.get("summary") or "A cinematic film scene"
            enriched_prompt = raw_prompt
            
            for char_app in character_appearances:
                name = char_app["name"]
                desc_parts = []
                if char_app.get("body_type") and char_app["body_type"] != "Unknown":
                    desc_parts.append(char_app["body_type"])
                if char_app.get("appearance") and char_app["appearance"] != "Unknown":
                    desc_parts.append(char_app["appearance"])
                if char_app.get("hair") and char_app["hair"] != "Unknown":
                    desc_parts.append(f"{char_app['hair']} hair")
                if char_app.get("face") and char_app["face"] != "Unknown":
                    desc_parts.append(f"{char_app['face']} face")
                if char_app.get("wardrobe") and char_app["wardrobe"] != "Unknown":
                    desc_parts.append(f"wearing {char_app['wardrobe']}")
                if char_app.get("accessories") and char_app["accessories"] != "Unknown":
                    desc_parts.append(char_app["accessories"])

                desc_str = ", ".join([d for d in desc_parts if d and d != "Unknown"])
                if desc_str:
                    replacement = f"{name} (a {desc_str})"
                else:
                    replacement = name

                pattern = re.compile(rf'\b{re.escape(name)}\b', re.IGNORECASE)
                enriched_prompt = pattern.sub(replacement, enriched_prompt)

            # 4. Environment details enrichment
            if environment_description:
                env_parts = []
                if environment_description.get("architecture") and environment_description["architecture"] != "Unknown":
                    env_parts.append(f"architecture: {environment_description['architecture']}")
                if environment_description.get("weather") and environment_description["weather"] != "Unknown":
                    env_parts.append(f"weather: {environment_description['weather']}")
                if environment_description.get("mood") and environment_description["mood"] != "Unknown":
                    env_parts.append(f"mood: {environment_description['mood']}")
                if environment_description.get("color_palette") and environment_description["color_palette"] != "Unknown":
                    env_parts.append(f"colors: {environment_description['color_palette']}")

                env_str = ", ".join(env_parts)
                if env_str:
                    enriched_prompt += f". Environment: {location_name} ({env_str})"

            # 5. Resolve specs & parameters
            camera_movement = scene_dict.get("camera_movement") or scene_dict.get("camera_setup") or "Static"
            lighting_design = scene_dict.get("lighting_design") or (environment_description.get("lighting") if environment_description else "Ambient")
            negative_prompt = scene_dict.get("negative_prompt") or "cartoon, 3d render, low quality, shaky cam, text"
            
            # Duration parsing
            duration_str = scene_dict.get("duration", "10 seconds")
            duration = 10
            try:
                digits = re.findall(r'\d+', str(duration_str))
                if digits:
                    duration = int(digits[0])
            except Exception:
                pass
            duration = max(10, min(15, duration)) # Clamped to 10-15s

            aspect_ratio = project.aspect_ratio or "16:9"

            # Compose references based on Reference Strategy
            strategy = scene_dict.get("reference_strategy") or "automatic"
            composed_reference = None

            # Map relative local static paths
            local_char_paths = []
            for path in character_references:
                if not path:
                    continue
                clean = path
                if clean.startswith("/static/"):
                    clean = clean.lstrip("/")
                if not os.path.exists(clean) and os.path.exists(os.path.join("backend", clean)):
                    clean = os.path.join("backend", clean)
                local_char_paths.append(clean)

            local_env_path = None
            if environment_reference:
                clean = environment_reference
                if clean.startswith("/static/"):
                    clean = clean.lstrip("/")
                if not os.path.exists(clean) and os.path.exists(os.path.join("backend", clean)):
                    clean = os.path.join("backend", clean)
                local_env_path = clean

            if strategy == "character_priority" and character_references:
                composed_reference = character_references[0]
            elif strategy == "environment_priority" and environment_reference:
                composed_reference = environment_reference
            else:
                # Automatic: Composite Character(s) & Environment
                if local_char_paths and local_env_path and os.path.exists(local_env_path):
                    try:
                        composed_reference = ScenePackageCompiler._compose_reference_board(
                            project_id, scene_number, local_char_paths, local_env_path, {
                                "scene_number_str": scene_dict.get("scene_number", f"SCENE {scene_number:02d}"),
                                "characters": [c["name"] for c in character_appearances],
                                "environment": environment_description.get("name", "Unknown")
                            }
                        )
                    except Exception as e:
                        logger.error(f"Fails to generate reference board composition: {e}")
                        composed_reference = environment_reference or (character_references[0] if character_references else None)
                else:
                    composed_reference = environment_reference or (character_references[0] if character_references else None)

            package = {
                "project_id": project_id,
                "scene_number": scene_number,
                "scene_description": scene_dict.get("summary", ""),
                "story_context": project.script or "",
                "character_references": character_references,
                "character_appearances": character_appearances,
                "environment_reference": environment_reference,
                "environment_description": environment_description,
                "lighting_design": lighting_design,
                "camera_movement": camera_movement,
                "camera_setup": scene_dict.get("camera_setup", "Standard"),
                "motion_instructions": f"Camera moving: {camera_movement}. Lighting: {lighting_design}.",
                "negative_prompt": negative_prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "reference_strategy": strategy,
                "composed_reference": composed_reference,
                "enriched_prompt": enriched_prompt
            }

            # 6. Save Scene Manifest JSON file
            try:
                os.makedirs("static/uploads/manifests", exist_ok=True)
                manifest_filename = f"manifest_{project_id}_{scene_number}.json"
                manifest_filepath = os.path.join("static/uploads/manifests", manifest_filename)
                with open(manifest_filepath, "w") as f:
                    json.dump(package, f, indent=2)
                logger.info(f"Successfully serialized manifest to {manifest_filepath}")
            except Exception as e:
                logger.error(f"Failed to write scene manifest: {e}")

            return package

        finally:
            db.close()

    @staticmethod
    def _compose_reference_board(project_id: int, scene_number: int, char_paths: list[str], env_path: str, metadata: dict) -> str:
        # Create dark 16:9 canvas (1280x720)
        canvas_w = 1280
        canvas_h = 720
        board = Image.new("RGB", (canvas_w, canvas_h), (12, 12, 16))

        # Paste Character references on Top Half (Y: 0 to 360)
        if char_paths:
            num_chars = len(char_paths)
            char_box_w = canvas_w // num_chars
            char_box_h = 360
            for i, c_path in enumerate(char_paths):
                try:
                    if os.path.exists(c_path):
                        c_img = Image.open(c_path)
                        # Resize preserving aspect ratio
                        c_img.thumbnail((char_box_w - 40, char_box_h - 40))
                        # Center inside slot
                        slot_x = i * char_box_w + (char_box_w - c_img.width) // 2
                        slot_y = (char_box_h - c_img.height) // 2
                        board.paste(c_img, (slot_x, slot_y))
                except Exception as e:
                    logger.error(f"Failed pasting character reference image {c_path}: {e}")

        # Paste Environment reference on Bottom Half (Y: 360 to 720)
        if env_path and os.path.exists(env_path):
            try:
                e_img = Image.open(env_path)
                e_img.thumbnail((canvas_w - 40, 320))
                slot_x = (canvas_w - e_img.width) // 2
                slot_y = 360 + (360 - e_img.height) // 2
                board.paste(e_img, (slot_x, slot_y))
            except Exception as e:
                logger.error(f"Failed pasting environment reference image {env_path}: {e}")

        # Draw metadata text labels
        try:
            draw = ImageDraw.Draw(board)
            text = f"SCENE: {metadata.get('scene_number_str', 'N/A')} | CHARS: {', '.join(metadata.get('characters', []))} | ENV: {metadata.get('environment', 'N/A')}"
            draw.text((20, canvas_h - 25), text, fill=(156, 163, 175))
        except Exception as e:
            logger.error(f"Failed to draw text overlay: {e}")

        # Save output
        out_filename = f"composed_ref_{project_id}_{scene_number}_{uuid.uuid4().hex[:8]}.png"
        os.makedirs("static/uploads", exist_ok=True)
        out_filepath = os.path.join("static/uploads", out_filename)
        board.save(out_filepath)
        return f"/static/uploads/{out_filename}"
