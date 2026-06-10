from fastapi import APIRouter

from app.services.project_state import project_state

router = APIRouter(tags=['planning'])


@router.get("/planning")
def get_production_plan():
    plan = project_state.get_production_plan()
    if plan is None:
        return {"hasProject": False, "plan": None}
    return {"hasProject": True, "plan": plan}
