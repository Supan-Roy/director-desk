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
    def _resolve_character_name(raw_name: str, char_assets: list) -> CharacterAsset | None:
        trimmed = raw_name.strip().lower()
        if not trimmed:
            return None
            
        # Tier 1: Exact / Case-insensitive match
        for asset in char_assets:
            if asset.character_name.lower().strip() == trimmed:
                return asset
                
        # Tier 2: Heuristics
        # Remove common prefixes/honorifics
        titles = ["dr.", "dr", "mr.", "mr", "mrs.", "mrs", "ms.", "ms", "agent", "officer", "captain", "professor", "the"]
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
            if cleaned_raw == cleaned_asset or (len(cleaned_raw) > 2 and cleaned_raw in cleaned_asset) or (len(cleaned_asset) > 2 and cleaned_asset in cleaned_raw):
                return asset
                
        return None

    @staticmethod
    def _resolve_all_scene_characters(project_id: int, db, scene_text: str, scene_chars: list[str]) -> dict[str, CharacterAsset]:
        char_assets = db.query(CharacterAsset).filter(CharacterAsset.project_id == project_id).all()
        resolved_map = {}
        unresolved_names = []
        
        # Run Tier 1 and Tier 2
        for raw_name in scene_chars:
            if not raw_name or not raw_name.strip():
                continue
            asset = ScenePackageCompiler._resolve_character_name(raw_name, char_assets)
            if asset:
                resolved_map[raw_name] = asset
            else:
                unresolved_names.append(raw_name)
                
        # Tier 3: Contextual Pronoun / Reference Resolver
        if unresolved_names and scene_text and char_assets:
            try:
                from app.services.qwen_service import qwen_service
                official_names = [c.character_name for c in char_assets]
                prompt = f"""
                You are a Continuity Supervisor for an AI Film Production Orchestrator.
                We have the following list of official character names for this project: {json.dumps(official_names)}.
                
                In the scene description below, the director refers to characters using these names, pronouns, or descriptions: {json.dumps(unresolved_names)}.
                
                Scene description:
                "{scene_text}"
                
                Map each mentioned name/pronoun to the correct official character name from the database.
                Determine whom pronouns (like "he", "she") or descriptions (like "the inventor", "the scientist") refer to.
                If a mention does not refer to any official character, map it to null.
                
                Respond ONLY with a valid JSON object mapping each raw mention to its official character name. No explanations, no markdown blocks.
                Example:
                {{
                  "He": "Leo",
                  "the inventor": "Leo"
                }}
                """
                response_text = qwen_service.generate_text(prompt)
                cleaned_response = response_text.replace("```json", "").replace("```", "").strip()
                resolved_json = json.loads(cleaned_response)
                
                for raw_name, official_name in resolved_json.items():
                    if official_name:
                        # Find the asset for the resolved official name
                        for asset in char_assets:
                            if asset.character_name.lower().strip() == official_name.lower().strip():
                                resolved_map[raw_name] = asset
                                break
            except Exception as e:
                logger.error(f"Error in Tier 3 LLM character alias resolution: {e}")
                
        return resolved_map

    @staticmethod
    def _enrich_prompt_with_spatial_layout(raw_prompt: str, character_appearances: list, environment_description: dict) -> str:
        try:
            from app.services.qwen_service import qwen_service
            char_info = []
            for c in character_appearances:
                char_info.append(f"{c['name']} ({c['appearance']})")
            
            env_info = environment_description.get("name", "Unknown Location")
            if environment_description.get("architecture") and environment_description["architecture"] != "Unknown":
                env_info += f" with {environment_description['architecture']} architecture"
                
            prompt = f"""
            You are a Director of Photography and Layout Director.
            Rewrite the raw cinematic prompt to define a spatial composition, camera layout, and character positioning (e.g., who is on the left/right/center, foreground/background, camera angle, and orientation).
            
            Raw Prompt: "{raw_prompt}"
            Characters present: {", ".join(char_info)}
            Environment: {env_info}
            
            Output ONLY the enriched, spatially detailed scene description. Keep it concise, high-contrast, visually rich, and under 60 words. No introductory text or extra commentary.
            """
            enriched = qwen_service.generate_text(prompt)
            return enriched.strip()
        except Exception as e:
            logger.error(f"Failed to enrich prompt spatially: {e}")
            return raw_prompt

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

            # Resolve character references using 3-tier resolver
            scene_chars = scene_dict.get("characters", [])
            if isinstance(scene_chars, str):
                scene_chars = [scene_chars]

            raw_prompt = scene_dict.get("ai_generation_prompt") or scene_dict.get("summary") or "A cinematic film scene"
            
            # 1. Character Alias Resolution (Tier 1, 2 & 3)
            resolved_chars_map = ScenePackageCompiler._resolve_all_scene_characters(
                project_id, db, raw_prompt, scene_chars
            )

            character_references = []
            character_appearances = []

            for raw_name, char_asset in resolved_chars_map.items():
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

            # 5. Spatial Prompt Enrichment with LLM
            final_spatial_prompt = ScenePackageCompiler._enrich_prompt_with_spatial_layout(
                enriched_prompt, character_appearances, environment_description
            )

            # 6. Resolve specs & parameters
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
                if local_char_paths or local_env_path:
                    try:
                        composed_reference = ScenePackageCompiler._compose_reference_board(
                            project_id, scene_number, local_char_paths, local_env_path, {
                                "scene_number_str": scene_dict.get("scene_number", f"SCENE {scene_number:02d}"),
                                "characters": [c["name"] for c in character_appearances],
                                "environment": environment_description.get("name", "Unknown")
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to generate reference board composition: {e}")
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
                "enriched_prompt": final_spatial_prompt
            }

            # 7. Save Scene Manifest JSON file
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
        
        # Prepare drawing context
        draw = ImageDraw.Draw(board)
        
        # Divide Top Row horizontally for characters & props
        total_top_items = len(char_paths)
        if total_top_items > 0:
            col_w = canvas_w // total_top_items
            for i, c_path in enumerate(char_paths):
                try:
                    if os.path.exists(c_path):
                        c_img = Image.open(c_path)
                        # Resize preserving aspect ratio to fit inside slot (with padding)
                        slot_padding = 20
                        max_w = col_w - slot_padding * 2
                        max_h = 360 - slot_padding * 2
                        c_img.thumbnail((max_w, max_h))
                        
                        # Center inside slot
                        slot_x = i * col_w + (col_w - c_img.width) // 2
                        slot_y = (360 - c_img.height) // 2
                        board.paste(c_img, (slot_x, slot_y))
                        
                        # Draw label
                        char_label = f"CHARACTER {i+1}"
                        if i < len(metadata.get("characters", [])):
                            char_label = f"CHAR: {metadata['characters'][i].upper()}"
                        draw.text((i * col_w + 10, 10), char_label, fill=(156, 163, 175))
                        
                except Exception as e:
                    logger.error(f"Failed pasting character reference image {c_path}: {e}")
                
                # Draw vertical separator line
                if i > 0:
                    draw.line([(i * col_w, 0), (i * col_w, 360)], fill=(33, 33, 40), width=2)
                    
        else:
            # Placeholder if no characters are present
            draw.text((20, 160), "NO CHARACTER REFERENCES ASSIGNED", fill=(100, 100, 110))
            
        # Draw horizontal split line
        draw.line([(0, 360), (canvas_w, 360)], fill=(33, 33, 40), width=2)
        
        # Paste Environment reference on Bottom Half (Y: 360 to 720)
        if env_path and os.path.exists(env_path):
            try:
                e_img = Image.open(env_path)
                e_img.thumbnail((canvas_w - 40, 320))
                slot_x = (canvas_w - e_img.width) // 2
                slot_y = 360 + (360 - e_img.height) // 2
                board.paste(e_img, (slot_x, slot_y))
                
                # Draw label
                env_label = f"ENVIRONMENT: {metadata.get('environment', 'Unknown').upper()}"
                draw.text((20, 370), env_label, fill=(156, 163, 175))
            except Exception as e:
                logger.error(f"Failed pasting environment reference image {env_path}: {e}")
        else:
            draw.text((20, 520), "NO ENVIRONMENT REFERENCE ASSIGNED", fill=(100, 100, 110))
            
        # Draw metadata text labels at the very bottom
        try:
            text = f"SCENE: {metadata.get('scene_number_str', 'N/A')} | CHARS: {', '.join(metadata.get('characters', []))} | ENV: {metadata.get('environment', 'N/A')}"
            draw.text((20, canvas_h - 25), text, fill=(229, 126, 37))  # Orange-accented label
        except Exception as e:
            logger.error(f"Failed to draw text overlay: {e}")
            
        # Save output
        out_filename = f"composed_ref_{project_id}_{scene_number}_{uuid.uuid4().hex[:8]}.png"
        os.makedirs("static/uploads", exist_ok=True)
        out_filepath = os.path.join("static/uploads", out_filename)
        board.save(out_filepath)
        return f"/static/uploads/{out_filename}"
