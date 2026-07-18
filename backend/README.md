# Director Desk Backend — Core Orchestration Engine

This is the Python-based FastAPI backend for Director Desk. It serves as the orchestrator for script parsing, AI generation pipelines, timeline video rendering, and post-production processing.

---

## 🏗️ Technical Architecture & Directory Structure

```
backend/
├── app/
│   ├── api/            # API Router endpoints
│   │   └── routes/     # Modular route handlers (Auth, Editor, Post-Prod, etc.)
│   ├── core/           # Configuration, security, and DB connection setup
│   ├── db/             # SQLAlchemy schemas, models, and session creation
│   ├── repository/     # Direct database access logic (CRUD for projects, assets)
│   └── services/       # Integration integrations (Whisper, TTS, Qwen, FFmpeg)
├── static/             # Local media uploads, exports, and overlays
├── requirements.txt    # Backend Python package dependencies
└── main.py / app/main.py # Application entry point
```

---

## ⚙️ Core Modules & Services

### 1. Multi-Track Timeline Render Engine ([editor.py](file:///d:/Programs%20and%20Codes/director-desk/backend/app/api/routes/editor.py))
Handles timeline compilation requested by the React frontend.
*   **Video Compositing:** Processes clips in the `videoTrack`. Each clip is isolated using `trim`, has its scale/fit configured, and is layered onto a canvas. To align the overlay with the video timeline, timestamps are offset using `setpts=PTS-STARTPTS+clip_start/TB` to prevent frames from freezing.
*   **VFX Blending:** Composites overlays (like rain, grain, or dust) using the FFmpeg `blend` filter with blending modes (e.g. `screen`, `addition`, `multiply`) and transparency values (`colorchannelmixer=aa=opacity`).
*   **Procedural Camera FX:** Applies coordinate and zoom transforms dynamically:
    *   *Screen Shake:* `crop` filter shifting x/y based on time sine waves: `x='20+15*sin(2*PI*12*(t-start))'`.
    *   *Zoom Punch:* `zoompan` with exponential decay: `z='1.0+0.35*exp(-3.5*(t-start))'`.
*   **Audio Mixing:** Extracts audio streams from video tracks, applies volume and fade effects, and uses `adelay` to align audio tracks with the timeline before mixing.

### 2. Audio Description & Ducking ([post_production_service.py](file:///d:/Programs%20and%20Codes/director-desk/backend/app/services/post_production_service.py))
*   **Silence Detection:** Analyzes SRT/WebVTT subtitles via `_find_ad_windows` to identify gaps of silence (minimum 2.5s) in the film.
*   **FFmpeg Audio Ducking:** Mixes original audio with the synthesized AD narration. Applies an advanced FFmpeg filtergraph to automatically duck/dim the background audio (e.g. by -15dB) during active AD speech intervals and restore volume levels during silences.

### 3. Local Speech-to-Text ([post_production_service.py](file:///d:/Programs%20and%20Codes/director-desk/backend/app/services/post_production_service.py))
*   Uses a local **`faster-whisper` (tiny model)** to transcribe video files.
*   **VAD Tuning:** The Voice Activity Detection filter is tuned for sparse dialogue in silent videos:
    ```python
    vad_parameters={
        "threshold": 0.30,              # Lower speech probability threshold
        "min_silence_duration_ms": 500,  # Prevent VAD from shifting timestamps across large silent windows
        "speech_pad_ms": 400,            # Buffer around speech chunks so edge words aren't dropped
        "min_speech_duration_ms": 100,   # Capture short utterances
    }
    ```

### 4. Dynamic Asset Resolver ([asset_resolver.py](file:///d:/Programs%20and%20Codes/director-desk/backend/app/services/asset_resolver.py))
*   **Tunnel Mapping:** If `PUBLIC_BASE_URL` (like an ngrok tunnel) is set in `.env`, the resolver bypasses third-party hosting and maps local file paths (e.g. `/static/uploads/image.png`) directly to public URLs (e.g. `https://xxxx.ngrok-free.app/static/uploads/image.png`) so that cloud APIs can download them.
*   **Dynamic Reloading:** Explicitly reloads the `.env` file with `load_dotenv(override=True)` on every resolution request, allowing users to update the ngrok tunnel URL without restarting the backend process.
*   **Scraper Fallback:** If no tunnel is defined, it uploads assets to `tmpfiles.org` and parses the dynamic direct download link from the landing page HTML.

---

## 🗄️ Database Schema & Models ([db/models.py](file:///d:/Programs%20and%20Codes/director-desk/backend/app/db/models.py))

Uses **SQLAlchemy ORM** to manage a local SQLite database (`director_desk.db`):
*   **User:** Handles authentication, password hashing (`bcrypt`), and user roles.
*   **Project:** Stores project metadata, production types, aspect ratios, screenplays, generated storyboards, and final mastered movie URLs.
*   **SceneVideo:** Logs generated video files, model configurations, prompts used, and credits consumed.
*   **Character / Voice / Environment:** Stores visual casting and voice casting profiles.
*   **Template:** Stores reusable preset style templates.

---

## ⚡ Setup & Local Run

### Prerequisites
*   Python 3.10+
*   FFmpeg (installed and added to your system's `PATH`)
*   Redis server (running locally)

### Installation
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv .venv
    # Windows:
    .venv\Scripts\activate
    # macOS/Linux:
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure your variables by copying `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
5.  Start the FastAPI application:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

The API documentation will be available locally at `http://localhost:8000/docs`.
