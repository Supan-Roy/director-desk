import time
import logging
from typing import Generator

from app.services.showrunner_orchestrator import showrunner_orchestrator
from app.services.project_state import project_state
from app.schemas.responses import GenerateResponse
from app.services.qwen_service import qwen_service

from app.agents.writer_agent import writer_agent
from app.agents.storyboard_agent import storyboard_agent
from app.services.storyboard_parser import storyboard_parser
from app.agents.planner_agent import planner_agent
from app.agents.critic_agent import critic_agent
from app.agents.showrunner_agent import showrunner_agent
from app.agents.scene_breakdown_agent import scene_breakdown_agent

logger = logging.getLogger(__name__)


class ShowrunnerService:

    def generate(self, prompt: str, mode: str = "fast", production_type: str = "Auto Detect", files: list = None) -> GenerateResponse:
        if production_type == "Auto Detect" or not production_type:
            production_type = showrunner_agent.detect_production_type(prompt)
            
        from app.services.content_processor import content_processor
        unified_context = content_processor.process_files(files or [])
        if unified_context:
            full_prompt = f"{prompt}\n\n[Reference Context Files]\n{unified_context}"
        else:
            full_prompt = prompt

        result = showrunner_agent.generate_all(full_prompt, production_type)

        # Convert storyboard list to text for Scene Breakdown Agent
        storyboard_list = result.get("storyboard", [])
        storyboard_text = "\n\n".join([
            f"Scene Number: {s.scene_number if hasattr(s, 'scene_number') else s.get('scene_number', s.get('scene', 1))}\n"
            f"Camera Shot: {s.camera_shot if hasattr(s, 'camera_shot') else s.get('camera_shot', s.get('shot', 'Wide Shot'))}\n"
            f"Environment: {s.environment if hasattr(s, 'environment') else s.get('environment', 'Set')}\n"
            f"Mood: {s.mood if hasattr(s, 'mood') else s.get('mood', 'Atmospheric')}"
            for s in storyboard_list
        ])
        
        is_podcast = production_type == "Podcast"
        if is_podcast:
            breakdown = {
                "total_runtime": "N/A",
                "consistency_warnings": [],
                "scenes": [],
                "asset_requirements": {
                    "characters_needed": [],
                    "locations_needed": [],
                    "props_needed": [],
                    "sound_requirements": ["Podcast main audio track"],
                    "vfx_requirements": []
                }
            }
        else:
            sb_text = storyboard_text if production_type != "Audio Story" else "N/A (Audio Production - No Storyboard)"
            breakdown = scene_breakdown_agent.generate_breakdown(
                full_prompt,
                result["script"],
                sb_text,
                result.get("production_plan")
            )

        project_state.set_generation_complete(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_review=result.get("critic_review"),
            scene_breakdown=breakdown,
            production_type=production_type
        )

        return GenerateResponse(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_notes=result.get("critic_review", {}).get("suggestions", []),
            critic_review=result.get("critic_review"),
            scene_breakdown=breakdown
        )

    def generate_stream(self, prompt: str, mode: str = "fast", production_type: str = "Auto Detect", files: list = None) -> Generator[dict, None, None]:
        # Normalize mode string
        mode = (mode or "fast").strip().lower()
        logger.info(f"ShowrunnerService: Starting streaming generation in {mode.upper()} mode...")

        # Reset state and start production
        project_state.reset()
        project_state.has_project = True
        project_state.prompt = prompt

        # Stage 0: Detect/Set Production Type
        if production_type == "Auto Detect" or not production_type:
            production_type = showrunner_agent.detect_production_type(prompt)
            
        project_state.production_type = production_type
        
        yield {
            "type": "production_type",
            "data": production_type
        }

        # Process uploaded files and build full prompt
        from app.services.content_processor import content_processor
        unified_context = content_processor.process_files(files or [])
        if unified_context:
            full_prompt = f"{prompt}\n\n[Reference Context Files]\n{unified_context}"
        else:
            full_prompt = prompt

        if mode == "studio":
            # Stage 1: Writer Agent generates script
            project_state.set_agent_status("writer", "active")
            
            title = showrunner_agent.generate_short_title(prompt)
            project_state.title = title
            yield {
                "type": "title",
                "data": title
            }
            
            is_audio = production_type in ["Podcast", "Audio Story"]
            format_guidelines = f"Create a script for a {production_type}."
            if production_type == "Podcast":
                format_guidelines += "\nInclude host and guest dialogues. Focus on conversations, audio transitions, and sound markers. Do NOT include any camera directions, shots, or visual descriptions."
            elif production_type == "Audio Story":
                format_guidelines += "\nInclude narrator descriptions, voice lines, and sound effect (SFX) directions. Do NOT include camera shots or visual framing."
            else:
                format_guidelines += "\nStructure it with clear scenes (e.g. SCENE 1: ...), visual action cues, and dialogue lines. Include camera shots or directions if helpful."

            script_prompt = f"""
            You are a Writer Agent in a production studio.
            Based on the user concept, write a script for a {production_type}.

            Concept:
            {full_prompt}

            Guidelines:
            {format_guidelines}

            Return 5 to 7 detailed scenes or sections. Use standard dialogue blocks starting with '>'.
            """
            
            script_accumulated = ""
            for chunk in qwen_service.generate_text_stream(script_prompt):
                script_accumulated += chunk
                yield {
                    "type": "script_chunk",
                    "data": chunk
                }
            
            project_state.script = script_accumulated
            project_state.original_script = script_accumulated
            project_state.set_agent_status("writer", "completed", "just now")

            # Stage 2: Storyboard Agent generates storyboard text, and parser parses it
            project_state.set_agent_status("storyboard", "active")
            
            storyboard_text_accumulated = ""
            if is_audio:
                project_state.storyboard = []
                project_state.set_agent_status("storyboard", "completed", "N/A")
                yield {
                    "type": "storyboard",
                    "data": []
                }
            else:
                storyboard_prompt = f"""
                Convert the script into a storyboard.

                Return ONLY this format:

                Scene Number: 1
                Camera Shot: Wide Shot
                Environment: Cyberpunk City
                Mood: Tense
                ---

                Scene Number: 2
                Camera Shot: Close Up
                Environment: Underground Base
                Mood: Suspenseful

                Script:
                {script_accumulated}
                """
                
                for chunk in qwen_service.generate_text_stream(storyboard_prompt):
                    storyboard_text_accumulated += chunk
                    storyboard_parsed = storyboard_parser.parse(storyboard_text_accumulated)
                    mapped_storyboard = [
                        {
                            "scene": s.scene_number,
                            "shot": s.camera_shot,
                            "environment": s.environment,
                            "mood": s.mood,
                            "description": f"{s.camera_shot} in {s.environment} — {s.mood}",
                        }
                        for s in storyboard_parsed
                    ]
                    
                    project_state.storyboard = storyboard_parsed
                    yield {
                        "type": "storyboard",
                        "data": mapped_storyboard
                    }
                    
                project_state.set_agent_status("storyboard", "completed", "just now")

            # Stage 3: Scene Breakdown Agent generates scene breakdown
            project_state.set_agent_status("scene_breakdown", "active")
            if production_type == "Podcast":
                breakdown = {
                    "total_runtime": "N/A",
                    "consistency_warnings": [],
                    "scenes": [],
                    "asset_requirements": {
                        "characters_needed": [],
                        "locations_needed": [],
                        "props_needed": [],
                        "sound_requirements": ["Podcast main audio track"],
                        "vfx_requirements": []
                    }
                }
            else:
                sb_text = storyboard_text_accumulated if production_type != "Audio Story" else "N/A (Audio Production - No Storyboard)"
                breakdown = scene_breakdown_agent.generate_breakdown(
                    full_prompt,
                    script_accumulated,
                    sb_text,
                    None
                )
            
            project_state.scene_breakdown = breakdown
            project_state.set_agent_status("scene_breakdown", "completed", "just now")

            yield {
                "type": "scene_breakdown",
                "data": breakdown
            }

            # Stage 4: Production Planner Agent generates phase-wise actions
            project_state.set_agent_status("planner", "active")
            plan = planner_agent.generate_plan(title, script_accumulated, storyboard_text_accumulated, production_type)
            
            project_state.production_plan = plan
            project_state.set_agent_status("planner", "completed", "just now")

            yield {
                "type": "production_plan",
                "data": plan
            }

            # Stage 5: Critic Agent generates structured review
            project_state.set_agent_status("critic", "active")
            if production_type == "Podcast":
                critic_review = {"overall_rating": "N/A", "suggestions": []}
                project_state.critic_review = critic_review
                project_state.critic_notes = []
                project_state.set_agent_status("critic", "completed", "N/A")
            else:
                critic_review = critic_agent.generate_review(script_accumulated, storyboard_text_accumulated)
                project_state.critic_review = critic_review
                project_state.critic_notes = critic_review.get("suggestions", []) if critic_review else []
                project_state.set_agent_status("critic", "completed", "just now")

            yield {
                "type": "critic_review",
                "data": critic_review
            }

            yield {
                "type": "complete"
            }

        else:
            # FAST mode: Single AI call, then stream with progressive pacing
            project_state.set_agent_status("writer", "active")
            result = showrunner_agent.generate_all(full_prompt, production_type)
            
            production_type = result.get("production_type", production_type)
            project_state.production_type = production_type
            
            # 1. Title
            title = result["title"]
            project_state.title = title
            yield {
                "type": "title",
                "data": title
            }
            
            # 2. Script
            script = result["script"]
            project_state.script = script
            project_state.original_script = script
            
            chunk_size = 40  # characters per chunk
            for i in range(0, len(script), chunk_size):
                chunk = script[i:i+chunk_size]
                yield {
                    "type": "script_chunk",
                    "data": chunk
                }
                time.sleep(0.03)
                
            project_state.set_agent_status("writer", "completed", "just now")
            project_state.set_agent_status("storyboard", "active")
            time.sleep(0.3)

            # 3. Storyboard
            storyboard = result["storyboard"]
            mapped_storyboard = [
                {
                    "scene": s.scene_number,
                    "shot": s.camera_shot,
                    "environment": s.environment,
                    "mood": s.mood,
                    "description": f"{s.camera_shot} in {s.environment} — {s.mood}",
                }
                for s in storyboard
            ]
            project_state.storyboard = storyboard
            
            is_audio = production_type in ["Podcast", "Audio Story"]
            if is_audio:
                project_state.set_agent_status("storyboard", "completed", "N/A")
                yield {
                    "type": "storyboard",
                    "data": []
                }
            else:
                for i in range(1, len(mapped_storyboard) + 1):
                    yield {
                        "type": "storyboard",
                        "data": mapped_storyboard[:i]
                    }
                    time.sleep(0.5)
                project_state.set_agent_status("storyboard", "completed", "just now")
                
            # 4. Scene Breakdown
            project_state.set_agent_status("scene_breakdown", "active")
            time.sleep(0.3)
            
            storyboard_list = result.get("storyboard", [])
            storyboard_text = "\n\n".join([
                f"Scene Number: {s.scene_number if hasattr(s, 'scene_number') else s.get('scene_number', s.get('scene', 1))}\n"
                f"Camera Shot: {s.camera_shot if hasattr(s, 'camera_shot') else s.get('camera_shot', s.get('shot', 'Wide Shot'))}\n"
                f"Environment: {s.environment if hasattr(s, 'environment') else s.get('environment', 'Set')}\n"
                f"Mood: {s.mood if hasattr(s, 'mood') else s.get('mood', 'Atmospheric')}"
                for s in storyboard_list
            ])
            
            if production_type == "Podcast":
                breakdown = {
                    "total_runtime": "N/A",
                    "consistency_warnings": [],
                    "scenes": [],
                    "asset_requirements": {
                        "characters_needed": [],
                        "locations_needed": [],
                        "props_needed": [],
                        "sound_requirements": ["Podcast main audio track"],
                        "vfx_requirements": []
                    }
                }
            else:
                breakdown = scene_breakdown_agent.generate_breakdown(
                    full_prompt,
                    result["script"],
                    storyboard_text,
                    result.get("production_plan")
                )
            
            project_state.scene_breakdown = breakdown
            project_state.set_agent_status("scene_breakdown", "completed", "just now")
            project_state.set_agent_status("planner", "active")
            
            yield {
                "type": "scene_breakdown",
                "data": breakdown
            }
            
            time.sleep(0.5)

            # 5. Production Plan
            plan = result["production_plan"]
            
            project_state.production_plan = plan
            project_state.set_agent_status("planner", "completed", "just now")
            project_state.set_agent_status("critic", "active")
            
            yield {
                "type": "production_plan",
                "data": plan
            }
            
            time.sleep(0.5)

            # 6. Critic review
            if production_type == "Podcast":
                critic_review = {"overall_rating": "N/A", "suggestions": []}
                project_state.critic_review = critic_review
                project_state.critic_notes = []
                project_state.set_agent_status("critic", "completed", "N/A")
            else:
                critic_review = result.get("critic_review")
                project_state.critic_review = critic_review
                project_state.critic_notes = critic_review.get("suggestions", []) if critic_review else []
                project_state.set_agent_status("critic", "completed", "just now")
            
            yield {
                "type": "critic_review",
                "data": critic_review
            }

            yield {
                "type": "complete"
            }

    def resume_generate_stream(self, project_id: int) -> Generator[dict, None, None]:
        from app.db.database import SessionLocal
        from app.services.project_service import project_service
        from app.schemas.responses import StoryboardScene

        db = SessionLocal()
        try:
            project = project_service.get_project_model(db, project_id)
            if not project:
                raise Exception(f"Project {project_id} not found")
            
            # Setup project state with existing data
            project_state.reset()
            project_state.id = project.id
            project_state.has_project = True
            project_state.title = project.title
            project_state.prompt = project.prompt
            project_state.production_type = project.production_type
            project_state.script = project.script
            project_state.original_script = project.original_script
            
            storyboard_objs = []
            for s in (project.storyboard or []):
                storyboard_objs.append(StoryboardScene(
                    scene_number=s.get('scene', s.get('scene_number', '')),
                    camera_shot=s.get('shot', s.get('camera_shot', '')),
                    environment=s.get('environment', ''),
                    mood=s.get('mood', '')
                ))
            project_state.storyboard = storyboard_objs
            
            # Set completed statuses for stages that are already generated
            # Stage 1: Script
            project_state.set_agent_status("writer", "completed", "just now")
            
            # Stage 2: Storyboard
            is_audio = project.production_type in ["Podcast", "Audio Story"]
            if is_audio:
                project_state.set_agent_status("storyboard", "completed", "N/A")
            elif project.storyboard:
                project_state.set_agent_status("storyboard", "completed", "just now")
                
            script_accumulated = project.script
            prompt = project.prompt
            production_type = project.production_type
            full_prompt = prompt
            
            # Reconstruct storyboard text
            storyboard_text_accumulated = ""
            for s in (project.storyboard or []):
                storyboard_text_accumulated += f"Scene Number: {s.get('scene', '')}\n"
                storyboard_text_accumulated += f"Camera Shot: {s.get('shot', '')}\n"
                storyboard_text_accumulated += f"Environment: {s.get('environment', '')}\n"
                storyboard_text_accumulated += f"Mood: {s.get('mood', '')}\n---\n\n"
            
            # Yield initial metadata to frontend
            yield {
                "type": "production_type",
                "data": production_type
            }
            yield {
                "type": "title",
                "data": project.title
            }
            yield {
                "type": "resume_init",
                "data": {
                    "production_type": production_type,
                    "script": project.script,
                    "storyboard": [
                        {
                            "scene": s.get('scene'),
                            "shot": s.get('shot'),
                            "environment": s.get('environment'),
                            "mood": s.get('mood'),
                            "description": f"{s.get('shot')} in {s.get('environment')} — {s.get('mood')}",
                        }
                        for s in (project.storyboard or [])
                    ]
                }
            }

            # ── Check Stage 3: Scene Breakdown ──
            if not project.scene_breakdown:
                project_state.set_agent_status("scene_breakdown", "active")
                yield {
                    "type": "agent_status_change",
                    "agent": "scene_breakdown",
                    "status": "active"
                }
                
                if production_type == "Podcast":
                    breakdown = {
                        "total_runtime": "N/A",
                        "consistency_warnings": [],
                        "scenes": [],
                        "asset_requirements": {
                            "characters_needed": [],
                            "locations_needed": [],
                            "props_needed": [],
                            "sound_requirements": ["Podcast main audio track"],
                            "vfx_requirements": []
                        }
                    }
                else:
                    sb_text = storyboard_text_accumulated if production_type != "Audio Story" else "N/A (Audio Production - No Storyboard)"
                    breakdown = scene_breakdown_agent.generate_breakdown(
                        full_prompt,
                        script_accumulated,
                        sb_text,
                        None
                    )
                project_state.scene_breakdown = breakdown
                project_state.set_agent_status("scene_breakdown", "completed", "just now")
                yield {
                    "type": "scene_breakdown",
                    "data": breakdown
                }
            else:
                project_state.scene_breakdown = project.scene_breakdown
                project_state.set_agent_status("scene_breakdown", "completed", "just now")
                yield {
                    "type": "scene_breakdown",
                    "data": project.scene_breakdown
                }

            # ── Check Stage 4: Plan ──
            if not project.production_plan:
                project_state.set_agent_status("planner", "active")
                yield {
                    "type": "agent_status_change",
                    "agent": "planner",
                    "status": "active"
                }
                plan = planner_agent.generate_plan(project.title, script_accumulated, storyboard_text_accumulated, production_type)
                project_state.production_plan = plan
                project_state.set_agent_status("planner", "completed", "just now")
                yield {
                    "type": "production_plan",
                    "data": plan
                }
            else:
                project_state.production_plan = project.production_plan
                project_state.set_agent_status("planner", "completed", "just now")
                yield {
                    "type": "production_plan",
                    "data": project.production_plan
                }

            # ── Check Stage 5: Review ──
            if not project.critic_review:
                project_state.set_agent_status("critic", "active")
                yield {
                    "type": "agent_status_change",
                    "agent": "critic",
                    "status": "active"
                }
                if production_type == "Podcast":
                    critic_review = {"overall_rating": "N/A", "suggestions": []}
                    project_state.critic_review = critic_review
                    project_state.critic_notes = []
                    project_state.set_agent_status("critic", "completed", "N/A")
                else:
                    critic_review = critic_agent.generate_review(script_accumulated, storyboard_text_accumulated)
                    project_state.critic_review = critic_review
                    project_state.critic_notes = critic_review.get("suggestions", [])
                    project_state.set_agent_status("critic", "completed", "just now")
                yield {
                    "type": "critic_review",
                    "data": critic_review
                }
            else:
                project_state.critic_review = project.critic_review
                project_state.critic_notes = project.critic_review.get("suggestions", [])
                project_state.set_agent_status("critic", "completed", "just now")
                yield {
                    "type": "critic_review",
                    "data": project.critic_review
                }

            # Save updated project
            project_service.update_project(
                db,
                project_id,
                scene_breakdown=project_state.scene_breakdown,
                production_plan=project_state.production_plan,
                critic_review=project_state.critic_review
            )

            yield {
                "type": "complete"
            }

        finally:
            db.close()


showrunner_service = ShowrunnerService()