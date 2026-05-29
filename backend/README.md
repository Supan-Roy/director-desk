# Director Desk Backend

FastAPI scaffold for the Director Desk orchestration backend.

## Setup

Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Health Endpoint

- `GET /api/health`
- Response: `{ "status": "ok" }`

## Structure

- `app/api/routes/` modular router files
- `app/agents/` future writer, storyboard, planner, and editor agents
- `app/services/` shared integrations such as Qwen and ffmpeg helpers
- `app/schemas/` Pydantic request and response models
