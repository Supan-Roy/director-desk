![Director Desk Banner](frontend/public/images/studio_banner.png)

# Director Desk

Director Desk is an AI showrunner platform for orchestrating script generation, storyboard creation, scene planning, prompt generation, and video assembly.

## Tech Stack

- Frontend: React + Vite + TailwindCSS
- Backend: FastAPI (Python)
- Planned integrations: Qwen Cloud APIs, ffmpeg

## Repository Layout

- `frontend/` React app scaffold with Vite, TailwindCSS, and Axios service placeholders
- `backend/` FastAPI app scaffold with modular routing, agents, and service layers
- `docker-compose.yml` future-friendly local orchestration scaffold

## Run Locally

### Frontend

1. Install Node.js dependencies inside `frontend/`.
2. Create a local environment file from `frontend/.env.example`.
3. Start the dev server.

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API base URL to be exposed as `VITE_API_BASE_URL`.

### Backend

1. Create and activate a Python virtual environment inside `backend/`.
2. Install dependencies from `requirements.txt`.
3. Copy `backend/.env.example` to `.env` and adjust values if needed.
4. Start the FastAPI app.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend health endpoint is available at `GET /api/health`.

## Notes

- No authentication is configured yet.
- No database is configured yet.
- UI pages are intentionally left as placeholders for now.
- Docker support is scaffolded for future expansion but does not include production Dockerfiles yet.
