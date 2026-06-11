import logging
from app.agents.showrunner_agent import showrunner_agent
from app.agents.writer_agent import writer_agent
from app.agents.storyboard_agent import storyboard_agent
from app.agents.planner_agent import planner_agent
from app.agents.critic_agent import critic_agent
from app.services.storyboard_parser import storyboard_parser

logger = logging.getLogger(__name__)

class ShowrunnerOrchestrator:
    def run_production(self, prompt: str, mode: str = "fast") -> dict:
        # Normalize mode string
        mode = (mode or "fast").strip().lower()
        
        if mode == "studio":
            logger.info("Orchestrator: Running in STUDIO mode (multi-agent sequential calls)...")
            
            # Step 1: Writer Agent generates script
            script = writer_agent.generate_script(prompt)
            
            # Step 2: Storyboard Agent generates storyboard text, and parser parses it
            storyboard_text = storyboard_agent.generate_storyboard(script)
            storyboard = storyboard_parser.parse(storyboard_text)
            
            # Set a baseline title
            title = f"Generated from: {prompt}"
            
            # Step 3: Production Planner Agent generates phase-wise actions
            plan = planner_agent.generate_plan(title, script, storyboard_text)
            
            # Step 4: Critic Agent generates review notes
            critic_notes = critic_agent.generate_notes(script, storyboard_text)
            
            return {
                "title": title,
                "script": script,
                "storyboard": storyboard,
                "production_plan": plan,
                "critic_notes": critic_notes
            }
        else:
            logger.info("Orchestrator: Running in FAST mode (single AI call)...")
            return showrunner_agent.generate_all(prompt)

showrunner_orchestrator = ShowrunnerOrchestrator()
