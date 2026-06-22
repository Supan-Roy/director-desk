"""
ProjectService — business logic layer between API routes and the repository.

Keeps all application logic out of routes and raw SQL out of services.
"""
import logging
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.repository import project_repository
from app.db.models import Project
from app.schemas.project_schemas import ProjectDetail, ProjectSummary

logger = logging.getLogger(__name__)


class ProjectService:

    def save_project(
        self,
        db: Session,
        *,
        title: str,
        production_type: Optional[str],
        prompt: Optional[str],
        script: Optional[str],
        original_script: Optional[str] = None,
        storyboard: Optional[list],
        production_plan: Optional[dict],
        critic_review: Optional[dict] = None,
        scene_breakdown: Optional[dict] = None,
        approved: bool = False,
    ) -> Project:
        """
        Persist a completed generation as a Project record.
        Called automatically after a successful generation stream completes.
        """
        logger.info(f"Auto-saving project: '{title}' [{production_type}]")
        project = project_repository.create(
            db,
            title=title,
            production_type=production_type,
            prompt=prompt,
            script=script,
            original_script=original_script or script,
            storyboard=storyboard,
            production_plan=production_plan,
            critic_review=critic_review,
            scene_breakdown=scene_breakdown,
            approved=approved,
        )
        logger.info(f"Project saved: id={project.id}")
        return project

    def list_projects(self, db: Session) -> List[ProjectSummary]:
        """Return all projects as lightweight summaries for the sidebar."""
        projects = project_repository.get_all(db)
        return [ProjectSummary.model_validate(p) for p in projects]

    def get_project(self, db: Session, project_id: int) -> ProjectDetail:
        """Return a full project record. Raises 404 if not found."""
        project = self.get_project_model(db, project_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )
        
        # Auto-extract environments and voices if they are null in database
        updated = False
        if project.environments is None:
            project.environments = self.extract_default_environments(project)
            updated = True
        if project.voices is None:
            project.voices = self.extract_default_voices(project)
            updated = True
            
        if updated:
            project_repository.update(db, project_id, environments=project.environments, voices=project.voices)
            
        return ProjectDetail.model_validate(project)

    def extract_default_environments(self, project) -> list:
        environments_map = {}
        
        scenes = []
        if project.scene_breakdown and isinstance(project.scene_breakdown, dict):
            scenes = project.scene_breakdown.get("scenes", [])
            
        for idx, scene in enumerate(scenes):
            scene_num = scene.get("scene_number") or f"Scene {idx + 1}"
            if isinstance(scene_num, int):
                scene_num = f"Scene {scene_num:02d}"
            elif isinstance(scene_num, str) and not scene_num.upper().startswith("SCENE"):
                scene_num = f"Scene {scene_num}"
                
            env_name = scene.get("environment") or scene.get("location") or scene.get("title")
            if not env_name:
                continue
            
            env_name = str(env_name).strip()
            if not env_name:
                continue
                
            if env_name not in environments_map:
                env_type = "Exterior"
                title_upper = str(scene.get("title", "")).upper()
                location_upper = str(scene.get("location", "")).upper()
                if "INT" in title_upper or "INT" in location_upper or "INTERIOR" in title_upper:
                    env_type = "Interior"
                elif "EXT" in title_upper or "EXT" in location_upper or "EXTERIOR" in title_upper:
                    env_type = "Exterior"
                else:
                    if "SKYLINE" in env_name.upper() or "STREET" in env_name.upper() or "OUTSIDE" in env_name.upper():
                        env_type = "Exterior"
                    else:
                        env_type = "Interior"
                        
                environments_map[env_name] = {
                    "name": env_name,
                    "scenes": [],
                    "type": env_type,
                    "visual_style": "Futuristic Cyberpunk" if "CYBERPUNK" in str(project.script or "").upper() else "Cinematic Sci-Fi",
                    "lighting": scene.get("lighting_design") or "Dawn Golden Light",
                    "weather": scene.get("weather") or "Clear",
                    "architecture": "Crystalline Mega Structures" if env_type == "Exterior" else "Industrial Steel Panel Tech",
                    "consistency_status": "Pending",
                    "generation_status": "Pending Reference",
                    "reference_image": "",
                    "blueprint_image": ""
                }
            if scene_num not in environments_map[env_name]["scenes"]:
                environments_map[env_name]["scenes"].append(scene_num)

        # Fallback to storyboard
        if not environments_map and project.storyboard:
            for idx, shot in enumerate(project.storyboard):
                scene_num = f"Scene {idx + 1}"
                env_name = shot.get("environment") or "Observation Deck"
                env_name = str(env_name).strip()
                if env_name not in environments_map:
                    environments_map[env_name] = {
                        "name": env_name,
                        "scenes": [scene_num],
                        "type": "Exterior" if "SKYLINE" in env_name.upper() or "SKY" in env_name.upper() or "OUTSIDE" in env_name.upper() else "Interior",
                        "visual_style": "Cinematic Sci-Fi",
                        "lighting": "Dawn Golden Light",
                        "weather": "Clear",
                        "architecture": "Crystalline Mega Structures",
                        "consistency_status": "Pending",
                        "generation_status": "Pending Reference",
                        "reference_image": "",
                        "blueprint_image": ""
                    }
                elif scene_num not in environments_map[env_name]["scenes"]:
                    environments_map[env_name]["scenes"].append(scene_num)

        # Final default fallback
        if not environments_map:
            environments_map["Observation Deck"] = {
                "name": "Observation Deck",
                "scenes": ["Scene 01"],
                "type": "Interior",
                "visual_style": "Futuristic Cyberpunk",
                "lighting": "Dawn Golden Light",
                "weather": "Clear",
                "architecture": "Crystalline Mega Structures",
                "consistency_status": "Pending",
                "generation_status": "Pending Reference",
                "reference_image": "",
                "blueprint_image": ""
            }
            
        for env in environments_map.values():
            env["scenes"].sort()
            
        return list(environments_map.values())

    def extract_default_voices(self, project) -> list:
        import re
        voices_map = {}
        
        scenes = []
        if project.scene_breakdown and isinstance(project.scene_breakdown, dict):
            scenes = project.scene_breakdown.get("scenes", [])
            
        for idx, scene in enumerate(scenes):
            chars = scene.get("characters") or []
            if isinstance(chars, str):
                chars = [c.strip() for c in chars.split(",") if c.strip()]
                
            for char_name in chars:
                char_name = str(char_name).strip()
                if not char_name or char_name.isdigit() or len(char_name) < 2:
                    continue
                    
                if char_name not in voices_map:
                    desc = str(scene.get("character_descriptions") or scene.get("wardrobe") or "").lower()
                    gender = "Neutral"
                    if "female" in desc or "woman" in desc or "girl" in desc or "she" in desc:
                        gender = "Female"
                    elif "male" in desc or "man" in desc or "boy" in desc or "he" in desc:
                        gender = "Male"
                        
                    age = "30"
                    if "young" in desc or "teen" in desc or "child" in desc or "boy" in desc or "girl" in desc:
                        age = "15"
                    elif "old" in desc or "elder" in desc or "senior" in desc:
                        age = "65"
                        
                    tone = "Curious"
                    speech_style = "Fast Thinker"
                    if "calm" in desc or "quiet" in desc or "silent" in desc:
                        tone = "Calm"
                        speech_style = "Measured"
                    elif "excited" in desc or "energetic" in desc:
                        tone = "Energetic"
                        speech_style = "Fast Speaker"
                    elif "robotic" in desc or "synth" in desc or "computer" in desc:
                        tone = "Monotone"
                        speech_style = "Precise"
                        
                    voices_map[char_name] = {
                        "character": char_name,
                        "gender": gender,
                        "age_range": age,
                        "tone": tone,
                        "speech_style": speech_style,
                        "emotion_range": "Wide",
                        "accent": "Neutral",
                        "status": "Pending Voice Creation",
                        "voice_id": "Not Assigned",
                        "voice_model": "None Selected",
                        "voice_preview": "None",
                        "consistency_status": "Pending",
                        "role": "Supporting"
                    }
                    
        if project.script:
            script_lines = project.script.split("\n")
            for line in script_lines:
                stripped = line.strip()
                if stripped and stripped.isupper() and len(stripped) < 20:
                    if stripped not in ["SCENE", "INT.", "EXT.", "INT", "EXT", "FADE IN", "FADE OUT", "CONTINUED", "TITLE", "SCRIPT"]:
                        if stripped not in voices_map:
                            voices_map[stripped] = {
                                "character": stripped,
                                "gender": "Neutral",
                                "age_range": "30",
                                "tone": "Curious",
                                "speech_style": "Fast Thinker",
                                "emotion_range": "Wide",
                                "accent": "Neutral",
                                "status": "Pending Voice Creation",
                                "voice_id": "Not Assigned",
                                "voice_model": "None Selected",
                                "voice_preview": "None",
                                "consistency_status": "Pending",
                                "role": "Supporting"
                            }

        if not voices_map and project.storyboard:
            for shot in project.storyboard:
                desc = shot.get("description", "")
                words = re.findall(r'\b[A-Z][a-z]+\b', desc)
                for word in words:
                    if word in ["The", "A", "An", "In", "On", "At", "With", "Under", "By", "Scene", "Shot", "Narrator"]:
                        continue
                    if word not in voices_map:
                        voices_map[word] = {
                            "character": word,
                            "gender": "Neutral",
                            "age_range": "30",
                            "tone": "Curious",
                            "speech_style": "Fast Thinker",
                            "emotion_range": "Wide",
                            "accent": "Neutral",
                            "status": "Pending Voice Creation",
                            "voice_id": "Not Assigned",
                            "voice_model": "None Selected",
                            "voice_preview": "None",
                            "consistency_status": "Pending",
                            "role": "Supporting"
                        }
                        
        if not voices_map:
            voices_map["Leo"] = {
                "character": "Leo",
                "gender": "Male",
                "age_range": "15",
                "tone": "Curious",
                "speech_style": "Fast Thinker",
                "emotion_range": "Wide",
                "accent": "Neutral",
                "status": "Pending Voice Creation",
                "voice_id": "Not Assigned",
                "voice_model": "None Selected",
                "voice_preview": "None",
                "consistency_status": "Pending",
                "role": "Lead"
            }
            
        if voices_map:
            lead_name = next(iter(voices_map))
            voices_map[lead_name]["role"] = "Lead"
            
        return list(voices_map.values())

    def get_project_model(self, db: Session, project_id: int) -> Optional[Project]:
        """Return the raw Project database model."""
        return project_repository.get_by_id(db, project_id)

    def delete_project(self, db: Session, project_id: int) -> None:
        """Delete a project. Raises 404 if not found."""
        deleted = project_repository.delete(db, project_id)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )

    def update_project(self, db: Session, project_id: int, **kwargs) -> ProjectDetail:
        """Update a project's fields dynamically. Raises 404 if not found."""
        project = project_repository.update(db, project_id, **kwargs)
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )
        return ProjectDetail.model_validate(project)

    def delete_all_projects(self, db: Session) -> None:
        """Permanently delete all projects."""
        project_repository.delete_all(db)


project_service = ProjectService()
