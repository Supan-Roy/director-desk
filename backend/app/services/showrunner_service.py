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
        
        is_audio = production_type in ["Podcast", "Audio Story"]
        if is_audio:
            breakdown = {
                "total_runtime": "N/A",
                "consistency_warnings": [],
                "scenes": [],
                "asset_requirements": {
                    "characters_needed": [],
                    "locations_needed": [],
                    "props_needed": [],
                    "sound_requirements": ["Audio Story/Podcast audio track"],
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
            if is_audio:
                breakdown = {
                    "total_runtime": "N/A",
                    "consistency_warnings": [],
                    "scenes": [],
                    "asset_requirements": {
                        "characters_needed": [],
                        "locations_needed": [],
                        "props_needed": [],
                        "sound_requirements": ["Audio Story/Podcast audio track"],
                        "vfx_requirements": []
                    }
                }
            else:
                breakdown = scene_breakdown_agent.generate_breakdown(
                    full_prompt,
                    script_accumulated,
                    storyboard_text_accumulated,
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
            critic_review = critic_agent.generate_review(script_accumulated, storyboard_text_accumulated)
            project_state.critic_review = critic_review
            project_state.critic_notes = critic_review.get("suggestions", [])
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
            
            if is_audio:
                breakdown = {
                    "total_runtime": "N/A",
                    "consistency_warnings": [],
                    "scenes": [],
                    "asset_requirements": {
                        "characters_needed": [],
                        "locations_needed": [],
                        "props_needed": [],
                        "sound_requirements": ["Audio Story/Podcast audio track"],
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


showrunner_service = ShowrunnerService()