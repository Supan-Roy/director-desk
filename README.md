# Director Desk 🎬 — Advanced AI Showrunner & Film Studio Platform

![Director Desk Banner](frontend/public/images/studio_banner.png)

Director Desk is a production-grade **AI Showrunner, Creative Director, and Post-Production Platform** that automates the cinematic storytelling pipeline. By bridging raw AI media generation with structured, controllable post-production workflows, Director Desk orchestrates the entire creative lifecycle—from screenplays and multi-agent character casting to environment scoping, multi-track audio ducking, sub-second subtitle synchronization, and final theatrical release packages.

Designed for filmmakers, creative directors, and hackathons, this platform delivers a **low-latency, zero-local-overhead architecture** by offloading heavy deep learning processes to cloud model APIs while orchestrating media assets via robust local compilation engines.

---

## 🏗️ System Architecture & Data Flow

The diagram below details how the Vite frontend interacts with the FastAPI backend, local SQLite database, Redis job queue, and external AI generation services.

![Director Desk - System Architecture & Workflow](frontend/public/images/Director%20Desk%20-%20System%20Architecture%20&%20Workflow.png)

---

## 🌟 Core Technical & Feature Pillars

### 1. Script Breakdown & Storyboard Parsing
*   **Industry Screenplay Parser:** Formats raw text scripts into industry-standard formatted screenplays.
*   **Storyboard Segmenter:** Splits screenplays into structural scene segments, parsing scene headers (e.g., `INT. SCIFI CHAMBER - NIGHT`), descriptive visual paragraphs, and dialogue text blocks.
*   **Timeline Editor:** A non-destructive editor allowing users to modify actions, reorder shots, configure aspect ratios, or delete scenes, immediately updating database state.

### 2. Character Studio & Visual Casting Consistency
*   **Structured Character Profiles:** Generates specific visual models including Gender, Age Group, Attire/Appearance, demographical details, and Personality Traits.
*   **Visual Continuity Engine:** Employs consistent character references across multiple scenes. Prompts combine casting traits with location presets to ensure actors retain key physical attributes across different shots.
*   **Custom Presets Lookbook:** Features a full-width vertical grid of curated style lookbooks (Cyberpunk, Noir, Sci-Fi Metropolis, Space Odyssey) with interactive hover-play video loops. Clicking a lookbook instantly configures the workspace's visual sliders.

### 3. Acoustic Voice Analyzer & Speaker Clustering
*   **Acoustic Feature Extractor:** Analyzes source audio segments to extract Root Mean Square (RMS) energy, Zero Crossing Rate (ZCR), and pitch profiles.
*   **Pitch Estimation Engine:** Employs an Autocorrelation/AMDF (Average Magnitude Difference Function) pitch tracking algorithm with octave-error correction to calculate the speaker's fundamental frequency ($F_0$).
*   **Automated Speaker Clustering:** Clusters distinct speakers in video uploads based on acoustic feature similarity metrics.
*   **Gender & Age Profiling:** Classifies speaker characteristics using frequency ranges ($F_0$ pitch) to map speakers to suitable voice profiles automatically.
*   **Subtitle Speaker Assignment:** Automatically links speaker identifiers to corresponding subtitle intervals so the system knows exactly *who* speaks *when* without manual annotation.

### 4. Smart Dubbing & Multilingual Translation
*   **Cloud API Translation:** Offloads subtitle and script translations to the **Alibaba Cloud Qwen API** (`qwen-plus`). Translates dialogue into Spanish, French, Japanese, Korean, Chinese, and Hindi with zero local GPU/RAM overhead.
*   **Synthetic Voice Cast Synthesis:** Maps speaker identifiers from the dialogue parser to character-specific voice profiles, generating synthetic vocals via `edge-tts` or `qwen-tts`.
*   **Multi-Track Dialogue Compilation:** Generates silent padding waves to align dialogue segments with original timestamps, preparing individual tracks for master mixing.

### 5. Audio Description (AD) & FFmpeg Ducking Engine
*   **Silent Action Window Locator:** Scans subtitle files (`_find_ad_windows`) to identify periods of silence (minimum 2.5s) where narrative descriptions can fit. If subtitles are missing, it defaults to full-film narration windows.
*   **Visual-to-Audio Description (AD):** Combines scene-specific visual details (camera angles, movements, character actions, lighting setups) into natural, spoken descriptors and translates them into narration.
*   **Dynamic FFmpeg Audio Ducking:** Mixes original backing audio with the synthesized AD narration. It applies an advanced FFmpeg filtergraph to automatically duck/dim backing track volumes (e.g. by -15dB) during active AD speech intervals and restore volume levels during silences.

### 6. Theatrical & Marketing Release Studio
*   **Poster Design Canvas:** Generates high-fidelity key-art using Qwen image APIs across diverse aspect ratios (Theatrical 16:9, YouTube Thumbnail 16:9, Vertical Poster 9:16, Social Banner 21:9).
*   **Interactive Billing Layer:** Uses an HTML5 Canvas API interface in the React frontend, allowing creators to dynamically write and overlay movie titles, credit billing, director credits, and laurel decorations. Exports to print-ready PNG/JPEG.
*   **Trailer Generation Engine:** Stitches together scene clips, overlays cinematic title cards, fades audio tracks, and mixes a backing trailer soundtrack and voiceover.

---

## 🔒 Technical Systems & Security Orchestration

### 🔑 Authentication & User Sessions
*   **Encryption and Hashing:** Password security managed via bcrypt hashing.
*   **One-Time Passcode (OTP):** Integrates SMTP services to dispatch verification OTPs for secure signups and recovery.
*   **Google OAuth 2.0:** Integrates Google Social login.
*   **JWT Sessions:** Secure, token-based session verification with configurable expiration windows.

### ⚙️ Asynchronous Job Queue & Streaming (SSE)
*   **Redis Background Queue:** Heavy video compilation and rendering jobs are scheduled and executed out-of-band to prevent HTTP timeouts.
*   **Server-Sent Events (SSE):** Provides real-time feedback to the frontend. Pushes active task progress (e.g., `progress=72`) and status messages (e.g. "Stitching Scene Videos...") over a persistent HTTP connection.

### 📈 Showrunner Production Graph
*   **State Machine Orchestrator:** Manages execution flow through standard production steps (Script breakdown -> Asset mapping -> Reference compilation -> Video rendering -> Master compiler) to ensure visual and auditory continuity.

---

## 🛠️ Technology Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, HTML5 Canvas API (for poster design overlays), marked.js
*   **Backend:** FastAPI (Python), SQLite (Local Database), SQLAlchemy ORM, Redis (Job queue management)
*   **AI Models & APIs:** Alibaba Cloud DashScope (Qwen-Plus, Wan2.6-T2I, Wan2.7-T2V, HappyHorse-I2V, Qwen-TTS), `faster-whisper` (Speech-to-Text)
*   **Media Processing:** FFmpeg (Video rendering, audio mixing, and ducking filters)

---

## 🚀 Installation & Local Run

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
