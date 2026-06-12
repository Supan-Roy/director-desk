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

logger = logging.getLogger(__name__)


class ShowrunnerService:

    def generate(self, prompt: str, mode: str = "fast") -> GenerateResponse:
        
        result = showrunner_orchestrator.run_production(prompt, mode)

        project_state.set_generation_complete(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_notes=result["critic_notes"]
        )

        return GenerateResponse(
            title=result["title"],
            script=result["script"],
            storyboard=result["storyboard"],
            production_plan=result["production_plan"],
            critic_notes=result["critic_notes"]
        )

    def generate_stream(self, prompt: str, mode: str = "fast") -> Generator[dict, None, None]:
        # Normalize mode string
        mode = (mode or "fast").strip().lower()
        logger.info(f"ShowrunnerService: Starting streaming generation in {mode.upper()} mode...")

        # Reset state and start production
        project_state.reset()
        project_state.has_project = True
        project_state.prompt = prompt

        if mode == "studio":
            # Stage 1: Writer Agent generates script
            project_state.set_agent_status("writer", "active")
            
            title = f"Generated from: {prompt}"
            project_state.title = title
            yield {
                "type": "title",
                "data": title
            }
            
            script_prompt = f"""
            Create a short movie trailer script.

            Idea:
            {prompt}

            Return 5 to 7 detailed scenes.
            """
            
            script_accumulated = ""
            for chunk in qwen_service.generate_text_stream(script_prompt):
                script_accumulated += chunk
                yield {
                    "type": "script_chunk",
                    "data": chunk
                }
            
            project_state.script = script_accumulated
            project_state.set_agent_status("writer", "completed", "just now")

            # Stage 2: Storyboard Agent generates storyboard text, and parser parses it
            project_state.set_agent_status("storyboard", "active")
            
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
            
            storyboard_text_accumulated = ""
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

            # Stage 3: Production Planner Agent generates phase-wise actions
            project_state.set_agent_status("planner", "active")
            plan = planner_agent.generate_plan(title, script_accumulated, storyboard_text_accumulated)
            
            project_state.production_plan = plan
            project_state.set_agent_status("planner", "completed", "just now")

            yield {
                "type": "production_plan",
                "data": plan
            }

            # Stage 4: Critic Agent generates review notes
            project_state.set_agent_status("critic", "active")
            critic_notes = critic_agent.generate_notes(script_accumulated, storyboard_text_accumulated)
            project_state.critic_notes = critic_notes
            project_state.set_agent_status("critic", "completed", "just now")

            yield {
                "type": "complete"
            }

        else:
            # FAST mode: Single AI call, then stream with progressive pacing
            project_state.set_agent_status("writer", "active")
            result = showrunner_agent.generate_all(prompt)
            
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
            
            for i in range(1, len(mapped_storyboard) + 1):
                yield {
                    "type": "storyboard",
                    "data": mapped_storyboard[:i]
                }
                time.sleep(0.5)
                
            project_state.set_agent_status("storyboard", "completed", "just now")
            project_state.set_agent_status("planner", "active")
            time.sleep(0.3)

            # 4. Production Plan
            plan = result["production_plan"]
            
            project_state.production_plan = plan
            project_state.set_agent_status("planner", "completed", "just now")
            project_state.set_agent_status("critic", "active")
            
            yield {
                "type": "production_plan",
                "data": plan
            }
            
            time.sleep(0.5)

            # 5. Critic notes
            critic_notes = result["critic_notes"]
            project_state.critic_notes = critic_notes
            project_state.set_agent_status("critic", "completed", "just now")
            
            yield {
                "type": "complete"
            }


showrunner_service = ShowrunnerService()