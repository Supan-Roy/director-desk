from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(api_router, prefix='/api')

@app.get("/")
def root():
    return {"message": "Lights, Camera, Action!"}


from app.api.routes.showrunner import router as showrunner_router

app.include_router(
    showrunner_router,
    prefix="/api",
    tags=["Showrunner"]
)