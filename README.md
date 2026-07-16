# Director Desk 🎬 — Advanced AI Showrunner & Film Studio Platform

![Director Desk Banner](frontend/public/images/studio_banner.png)

Director Desk is a production-grade **AI Showrunner, Creative Director, and Post-Production Platform** that automates the cinematic storytelling pipeline. It bridges the gap between raw AI media generation models and structured, controllable post-production editing. By managing screenplays, casting, location scouting, multi-track audio assembly, and final theatrical release packages, Director Desk orchestrates the entire creative lifecycle under a single cohesive dashboard.

Designed for filmmakers, creative directors, and hackathons, this platform delivers a **low-latency, zero-local-overhead architecture** by leveraging cloud model offloading combined with robust, local media compilation engines.

---

![Director Desk - System Architecture & Workflow](frontend/public/images/Director%20Desk%20-%20System%20Architecture%20&%20Workflow.png)

---

## 🌟 Core Innovation Pillars

### 1. Collaborative Multi-Agent AI Crew
Direct a specialized, 5-member AI production crew within a unified chat playground:
*   ✍️ **Screenplay Agent:** Generates, parses, and splits scripts into individual scenes.
*   🎭 **Casting Agent:** Designs distinct visual characters (defining gender, age group, apparel, demeanor, and ethnicity traits).
*   🌍 **Location Scout Agent:** Details settings, lighting profiles (volumetric flares, window keys), and architectural descriptions.
*   🎙️ **Voice Director Agent:** Programs specific speech rates, languages, and speaker signatures.
*   🎥 **Video Renderer Agent:** Translates script setups into prompt instructions for scene generators.

### 2. Multi-Track Post-Production Studio
*   **Subtitle Studio:** High-precision subtitle generation from video tracks using `faster-whisper` with a timeline editor to adjust timestamps down to the millisecond.
*   **Multilingual Dubbing Studio:** Zero-local-load translation using the cloud **Qwen Cloud API** to translate subtitles and scripts into Spanish, French, Japanese, Korean, Chinese, and Hindi.
*   **Smart Speaker Casting:** Dialogue tag extraction that parses character lines and maps them to distinct synthetic voice profiles (`edge-tts`/`qwen-tts`) to generate multi-voice dubbed tracks.
*   **Audio Description (AD) Engine:** Spoken narration of action scenes for visually impaired audiences, featuring **FFmpeg Audio Ducking** filters that lower background soundtracks dynamically when the AD narrator is speaking.

### 3. Theatrical & Marketing Release Studio
*   **Poster Generator:** Synthesize film key-art in multiple aspect ratios: Theatrical Poster (16:9), YouTube Thumbnail (16:9), Vertical Poster (9:16), and Social Banner (21:9). Overlays cast billing and credits using interactive HTML5 Canvas editing.
*   **Trailer Compiler:** Assembles generated video clips into high-impact 15s, 30s, or 60s promotional trailers, adding cinematic cuts, title cards, and backing soundtracks.

---

## ⚡ Technical Architecture (Alibaba Cloud Optimization)

To achieve maximum performance and stability on low-resource environments (like 2GB RAM / 2vCPU VPS instances), the system implements the following patterns:

*   **Cloud API Offloading:** Instead of running heavy deep-learning translation and TTS models locally, translation and voice synthesis are offloaded to **Alibaba Cloud DashScope APIs** (using `qwen-plus`). This maintains local RAM usage at a minimal ~150MB and CPU at 0-2% during active processing.
*   **Redis Background Job Workers:** Heavy rendering tasks (video stitching, audio ducking, trailer compilation) are sent to a background Redis queue.
*   **SSE Live Updates:** Progress percentages (e.g. `progress=68`) and descriptive logs are pushed in real time to the React frontend client using Server-Sent Events (SSE).
*   **Nginx File Streaming:** Up to 2GB file upload support configured via Nginx limits to accommodate high-quality raw video assets.

---

## 🛠️ Technology Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, HTML5 Canvas API, marked.js
*   **Backend:** FastAPI (Python), SQLite (database), SQLAlchemy (ORM), Redis (job queue)
*   **Integrations:** Alibaba Cloud DashScope (Qwen-Plus, Wan2.6-T2I, Wan2.7-T2V, HappyHorse-I2V, Qwen-TTS), `faster-whisper`
*   **Orchestration & Media:** FFmpeg-python, Docker & Docker Compose

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   FFmpeg (installed and added to your system's `PATH`)
*   Redis server (running locally or accessible via network)

### Setup Instructions

#### 1. Clone the Repository
```bash
git clone https://github.com/Supan-Roy/director-desk.git
cd director-desk
```

#### 2. Backend Installation & Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   *   Copy `.env.example` to `.env`.
   *   Set database URLs and API keys (e.g., `QWEN_API_KEY`, `QWEN_API_BASE_URL`).
5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 3. Frontend Installation & Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   *   Copy `.env.example` to `.env` (ensure `VITE_API_BASE_URL` points to `http://localhost:8000`).
4. Start the dev server:
   ```bash
   npm run dev
   ```

Open your browser and navigate to `http://localhost:5173` to launch the Director Desk studio.

---

## 👥 Hackathon Credits

**Developed by - Supan Roy**
*   **GitHub**: [@Supan-Roy](https://github.com/Supan-Roy)
*   **Contact**: [contact@supanroy.com](mailto:contact@supanroy.com)
