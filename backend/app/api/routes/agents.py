from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from app.services.qwen_service import qwen_service
import os

router = APIRouter(tags=["agents"])

# List of agents and their metadata/specifications
AGENTS_DIRECTORY = [
    {
        "id": "writer",
        "name": "Writer Agent",
        "role": "Screenplay & Dialogues",
        "description": "Generates scene scripts, dialogues, narrator blocks, and sound markers matching production type constraints.",
        "status": "Idle",
        "temperature": 0.7,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 20,
        "system_prompt": "You are a Writer Agent in a production studio. Your goal is to write high-quality screenplay scripts with clear action cues and character voice lines."
    },
    {
        "id": "storyboard",
        "name": "Storyboard Agent",
        "role": "Visual Direction & Prompting",
        "description": "Converts scene descriptions into hyper-detailed prompts optimized for AI video and image rendering engines.",
        "status": "Idle",
        "temperature": 0.5,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 15,
        "system_prompt": "You are a Storyboard Agent in a production studio. Your goal is to construct cinematic descriptive prompts specifying lens, lighting, style, and camera movement."
    },
    {
        "id": "critic",
        "name": "Critic Agent",
        "role": "Script Review & Quality Check",
        "description": "Analyzes screenplays for pacing, narrative structure, continuity errors, and suggests structural improvements.",
        "status": "Idle",
        "temperature": 0.2,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 10,
        "system_prompt": "You are a Critic Agent in a production studio. Critically review scripts and scenes, listing specific pros, cons, and recommendations for improvement."
    },
    {
        "id": "editor",
        "name": "Editor Agent",
        "role": "Post-production & Timeline",
        "description": "Calculates video clips lengths, aligns background audio tracks, and compiles multi-layered scene timelines.",
        "status": "Idle",
        "temperature": 0.3,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 15,
        "system_prompt": "You are an Editor Agent in a production studio. Calculate frame durations, align sound tracks, and output structured timelines."
    },
    {
        "id": "showrunner",
        "name": "Showrunner Agent",
        "role": "Orchestrator & Executioner",
        "description": "Supervises the generation pipeline, calling other agents in order and streaming full execution progress logs.",
        "status": "Idle",
        "temperature": 0.4,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 30,
        "system_prompt": "You are a Showrunner Agent. Orchestrate the pipeline and manage project tasks to ensure complete concept-to-cut automated execution."
    },
    {
        "id": "planner",
        "name": "Planner Agent",
        "role": "Pre-Production & Task Planning",
        "description": "Lays out pre-production roadmaps, identifies scene sequences, and drafts task lists for team agents.",
        "status": "Idle",
        "temperature": 0.3,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 10,
        "system_prompt": "You are a Planner Agent in a production studio. Plan timelines, checklists, resources, and dependencies to structure creative projects."
    },
    {
        "id": "scene_breakdown",
        "name": "Scene Breakdown Agent",
        "role": "Deconstruction & Asset Tagging",
        "description": "Extracts locations, characters, lighting styles, and props directly from raw script pages.",
        "status": "Idle",
        "temperature": 0.2,
        "model": os.getenv("QWEN_MODEL", "qwen-plus"),
        "credits_per_run": 10,
        "system_prompt": "You are a Scene Breakdown Agent. Parse visual scripts, extract all distinct characters, settings, and prop tags to register in the asset table."
    }
]


@router.get("/agents", response_model=List[Dict[str, Any]])
def get_agents():
    """Retrieve metadata and settings for all active production agents."""
    return AGENTS_DIRECTORY


@router.post("/agents/chat")
def chat_with_agent(
    agent_id: str = Body(..., embed=True),
    message: str = Body(..., embed=True),
    chat_history: List[Dict[str, str]] = Body(default=[], embed=True)
):
    """
    Execute a chat prompt with an agent persona inside the sandbox console.
    Simulates direct interaction with Qwen using the agent's system prompt.
    """
    agent = next((a for a in AGENTS_DIRECTORY if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent with id '{agent_id}' not found.")

    # Construct the instruction context
    system_instruction = agent["system_prompt"]
    
    # We can compile the full conversation history
    full_prompt = f"System Instruction: {system_instruction}\n\n"
    for turn in chat_history:
        role = "User" if turn.get("role") == "user" else "Agent"
        full_prompt += f"{role}: {turn.get('content')}\n"
    
    full_prompt += f"User: {message}\nAgent:"

    try:
        # Generate the completion text
        response_text = qwen_service.generate_text(full_prompt)
        return {"agent_id": agent_id, "response": response_text}
    except Exception as e:
        # Fallback to local offline mock mode if API Key is not configured
        import random
        offline_responses = [
            f"[OFFLINE WORKSPACE FALLBACK] As the {agent['name']}, I have received your request: '{message}'. To enable full automated LLM generation, please configure QWEN_API_KEY in your backend/.env.",
            f"[OFFLINE WORKSPACE FALLBACK] {agent['name']} here. I can write or review that scene perfectly. Once the API key is active, I will generate a rich creative outline.",
            f"[OFFLINE WORKSPACE FALLBACK] {agent['name']}: Received your message. Let's build the production! (Key missing, outputting placeholder response)."
        ]
        return {"agent_id": agent_id, "response": random.choice(offline_responses)}
