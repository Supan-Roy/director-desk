from fastapi import APIRouter

from app.services.project_state import project_state

router = APIRouter(tags=['project'])


@router.get("/project/status")
def get_project_status():
    agents = [agent.to_dict() for agent in project_state.agents]
    return {
        "hasProject": project_state.has_project,
        "title": project_state.title,
        "agents": agents,
    }


@router.post("/project/reset")
def reset_project():
    project_state.reset()
    return {"message": "Project reset"}
