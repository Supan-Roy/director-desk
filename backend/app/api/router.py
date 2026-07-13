from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.planning import router as planning_router
from app.api.routes.rendering import router as rendering_router
from app.api.routes.storyboard import router as storyboard_router
from app.api.routes.script import router as script_router
from app.api.routes.project import router as project_router
from app.api.routes.editor import router as editor_router
from app.api.routes.scene_breakdown import router as scene_breakdown_router
from app.api.routes.agents import router as agents_router
from app.api.routes.assets import router as assets_router
from app.api.routes.auth import router as auth_router
from app.api.routes.settings_auth import router as settings_auth_router
from app.api.routes.director_sync import router as director_sync_router
from app.api.routes.release import router as release_router
from app.api.routes.post_production import router as post_production_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(script_router)
api_router.include_router(storyboard_router)
api_router.include_router(planning_router)
api_router.include_router(rendering_router)
api_router.include_router(project_router)
api_router.include_router(editor_router)
api_router.include_router(scene_breakdown_router)
api_router.include_router(agents_router)
api_router.include_router(assets_router)
api_router.include_router(auth_router)
api_router.include_router(settings_auth_router)
api_router.include_router(director_sync_router)
api_router.include_router(release_router)
api_router.include_router(post_production_router)
